// Next.js API Route: TL;DR summarizer (modularized)

import Parser from "rss-parser";
import type { NextApiRequest, NextApiResponse } from 'next';
import { pickClientLocale, type ParsedLocale } from "./locale";
import { getRegionConfig, buildAllFeeds, type RegionConfig } from "./feeds";
import { timeOK, truncate, domainFromLink, normalizeGoogleNewsLink, calculateCategoryRelevance, dedupeArticles, dedupeSummaryBullets, type Article } from "./utils";
import { SPORT_TYPES } from './constants';
import { buildPrompt, generateSummary, GEMINI_MODEL, getModel, type LengthConfig } from "./llm";
import logger from "./logger";

interface RequestBody {
  region?: string;
  category?: string;
  style?: string;
  timeframeHours?: number;
  limit?: number;
  language?: string;
  locale?: string;
  query?: string;
  length?: string;
}

interface ApiResponse {
  ok: boolean;
  cached?: boolean;
  error?: string;
  details?: string;
  meta?: {
    region: string;
    category: string;
    style: string;
    timeframeHours: number;
    language: string;
    locale: string;
    usedArticles: number;
    model: string;
    length: string;
  };
  summary?: string;
}

interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}

interface SportBuckets {
  [key: string]: Article[];
}

// Reduce per-feed parser timeout to keep total feed fetching latency reasonable.
// Use a browser-like User-Agent because some feed endpoints (notably
// news.google.com) may reject or return different content to default
// server-side user-agents; setting a common UA increases the chance of
// getting normal RSS responses from hosts that block non-browser agents.
// Increase timeout slightly for better resiliency on serverless platforms.
const parser = new Parser({
  timeout: 12000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36'
    }
  }
});

// In-memory cache (per function instance)
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 3; // 3 minutes

// Per-request timeout to avoid platform FUNCTION_INVOCATION_TIMEOUTs and give
// the client a predictable error when upstream calls are slow.
// Increase to 45s to give the remote LLM more time on slow networks.
const REQUEST_TIMEOUT_MS = 45000; // 45s

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      done = true;
      try { if (onTimeout) onTimeout(); } catch {}
      reject(new Error('Request timed out'));
    }, ms);
    p.then((v) => {
      if (done) return; clearTimeout(timer); resolve(v);
    }).catch((e) => {
      if (done) return; clearTimeout(timer); reject(e);
    });
  });
}

// In-flight deduplication so concurrent/successive identical requests share the same work
const INFLIGHT = new Map<string, Promise<{ status: number; payload: ApiResponse }>>();

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    if (!getModel()) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY missing. Configure it in Vercel Project Settings > Environment Variables."
      });
    }

    // Ensure JSON body is parsed (Vercel usually parses if Content-Type is application/json)
    let body: RequestBody = req.body;
    if (!body) {
      try { body = JSON.parse(req.body || "{}"); } catch { body = {}; }
    } else if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const {
      region = "global",
      category = "top",
      style = "neutral",
      timeframeHours = 24,
      limit = 20,
      language: bodyLanguage,
      locale: bodyLocale,
      query = "",
      length = "medium"
    } = (body || {});

    // Determine locale from explicit body.locale or Accept-Language as fallback
    const acceptLanguage = (Array.isArray(req.headers["accept-language"]) 
      ? req.headers["accept-language"][0] 
      : req.headers["accept-language"]) || 
      (Array.isArray(req.headers["Accept-Language"]) 
        ? req.headers["Accept-Language"][0] 
        : req.headers["Accept-Language"]);
    const localePref: ParsedLocale = pickClientLocale({ bodyLocale, bodyLanguage, acceptLanguage });
    const language = (localePref.language || 'en');
    const uiLocale = localePref.normalized; // e.g., en-US

    const cacheKey = JSON.stringify({ region, category, style, timeframeHours, limit, language, query, length, uiLocale });
    const requestLog = logger.child({ route: '/api/tldr', region, category, style, timeframeHours, limit, language, query, length, uiLocale });
    requestLog.info('request received');
    
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      requestLog.info('cache hit', { ageMs: Date.now() - cached.ts });
      return res.status(200).json({ cached: true, ...cached.payload });
    }

    const compute = async (): Promise<{ status: number; payload: ApiResponse }> => {
      let payloadErrorForLogs: string | undefined = undefined;
      const urls = buildAllFeeds({ region, category, query, hours: timeframeHours, lang: language });
      requestLog.debug('feed urls built', { urls, sampleUrl: urls[0] });
      const regionCfgForLinks = getRegionConfig(region, language);

      const stopFeeds = logger.startTimer('fetch feeds', { urlCount: urls.length });

      // Fetch feeds with bounded concurrency and a single retry per-feed.
      // This reduces the chance of remote rate-limiting or transient
      // network failures when many feeds are requested at once from the
      // same Vercel function instance.
      const concurrency = Math.min(8, Math.max(3, Math.floor(urls.length / 6))); // sensible default based on url count

      const results: Array<any> = new Array(urls.length);
      let workerIndex = 0;

      const fetchWithRetries = async (u: string) => {
        let lastErr: any = null;
        const maxAttempts = 2;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const v = await parser.parseURL(u);
            return { status: 'fulfilled', value: v };
          } catch (e: any) {
            lastErr = e;
            requestLog.debug('feed fetch attempt failed', { url: u, attempt, message: String(e?.message || e) });
            if (attempt < maxAttempts) {
              // small backoff before retrying
              await new Promise((r) => setTimeout(r, 500 * attempt));
            }
          }
        }
        return { status: 'rejected', reason: lastErr };
      };

      const worker = async () => {
        while (true) {
          const i = workerIndex++;
          if (i >= urls.length) break;
          const u = urls[i];
          try {
            results[i] = await fetchWithRetries(u);
          } catch (e:any) {
            results[i] = { status: 'rejected', reason: e };
          }
        }
      };

      // Run workers under the request timeout to bound total time spent
      await withTimeout(
        Promise.all(new Array(Math.min(concurrency, urls.length)).fill(0).map(() => worker())),
        Math.max(REQUEST_TIMEOUT_MS - 8000, 8000),
        () => logger.warn('Feed fetching taking too long, aborting')
      );
      const perFeedCounts = (results as any[]).map((r: any) => (r.status === 'fulfilled' ? (r.value?.items?.length || 0) : -1));
      // Also capture rejection reasons for better observability on Vercel
      const perFeedErrors = (results as any[]).map((r: any) => (r.status === 'rejected' ? String(r.reason || r.reason?.message || 'unknown') : null));
      stopFeeds({ perFeedCounts, perFeedErrors });
      if (perFeedErrors.some(Boolean)) {
        // Log sample errors (avoid spamming logs with huge arrays)
        requestLog.debug('feed fetch errors', { sampleErrors: perFeedErrors.filter(Boolean).slice(0, 5) });
      }
      
      let items: any[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value?.items?.length) {
          items.push(...r.value.items);
        }
      }
      requestLog.info('feed items aggregated', { itemCount: items.length });

      const maxAge = Math.max(1, Math.min(72, Number(timeframeHours) || 24));
      const normalized: Article[] = [];
      const seen = new Set<string>();
      
      for (const it of items) {
        const title = (it.title || "").trim();
        let link = (it.link || "").trim();
        if (!title || !link) continue;

        // Normalize Google News links to include region/language for reliable redirect
        link = normalizeGoogleNewsLink(link, regionCfgForLinks);

        const key = title + "|" + domainFromLink(link);
        if (seen.has(key)) continue;
        seen.add(key);

        const isoDate = it.isoDate || it.pubDate || null;
        if (!timeOK(isoDate, maxAge)) continue;

        const article: Article = {
          title,
          link,
          source: it.source?.title || domainFromLink(link),
          isoDate: isoDate ? new Date(isoDate).toISOString() : null,
          snippet:
            it.contentSnippet ||
            it.summary ||
            truncate((it.content || "").replace(/<[^>]*>/g, ""), 300)
        };

        // Calculate category relevance
        article.categoryRelevance = calculateCategoryRelevance(article, category);
        normalized.push(article);
      }
      requestLog.debug('articles normalized', { count: normalized.length });

      // Boost local sources slightly for non-global region
      const regionCfgTmp = getRegionConfig(region, language);
      let regionTLD = regionCfgTmp.gl?.toLowerCase();
      // Map GB -> uk to match real-world ccTLD usage
      if (regionTLD === 'gb') regionTLD = 'uk';
      
      // If a specific region is requested, prefer local sources strongly and
      // deprioritize distant sources. Keep fallback logic to top up results later.
      for (const a of normalized) {
        const host = domainFromLink(a.link);
        if (region && region !== 'global' && host) {
          const h = host.toLowerCase();
          const titleSnippet = ((a.title || '') + ' ' + (a.snippet || '')).toLowerCase();
          const matchesRegionTLD = regionTLD && (h.endsWith('.' + regionTLD) || h === regionTLD);
          const containsRegionName = regionCfgTmp.name && titleSnippet.includes(regionCfgTmp.name.toLowerCase());

          if (matchesRegionTLD || containsRegionName) {
            // Strong boost for clearly local content
            a.categoryRelevance = Math.min(1, (a.categoryRelevance || 0.5) + 0.35);
            a._localMatch = true;
          } else {
            // Slight penalty to reduce global/other-country noise when a region is specified
            // Use a smaller penalty for politics to keep cross-border reporting
            const penalty = (category === 'politics') ? 0.15 : 0.25;
            a.categoryRelevance = Math.max(0, (a.categoryRelevance || 0.5) - penalty);
            a._localMatch = false;
          }
        }
      }

      // Sort by category relevance first, then by date
      normalized.sort((a, b) => {
        // Primary sort: category relevance (higher is better)
        const relevanceDiff = (b.categoryRelevance || 0) - (a.categoryRelevance || 0);
        if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
        
        // Secondary sort: date (newer is better)
        const ta = a.isoDate ? new Date(a.isoDate).getTime() : 0;
        const tb = b.isoDate ? new Date(b.isoDate).getTime() : 0;
        return tb - ta;
      });

      // Filter out low-relevance articles for specific categories
      let filteredArticles = normalized;
      if (category && category !== 'top' && category !== 'world') {
        // Politics can be phrased variably; use a slightly lower threshold there
        const threshold = category === 'politics' ? 0.12 : 0.2; // Minimum relevance threshold
        filteredArticles = normalized.filter(article => (article.categoryRelevance || 0) >= threshold);
        
        // If we filtered too aggressively and have too few articles, include some lower-relevance ones
        if (filteredArticles.length < 5 && normalized.length > filteredArticles.length) {
          const additionalCount = Math.min(5 - filteredArticles.length, normalized.length - filteredArticles.length);
          const lowRelevanceArticles = normalized.slice(filteredArticles.length, filteredArticles.length + additionalCount);
          filteredArticles = [...filteredArticles, ...lowRelevanceArticles];
        }
      }

      // Deduplicate near-identical stories across outlets (title similarity)
      // For politics, raise the similarity threshold to avoid merging distinct angles
      let uniqueArticles = dedupeArticles(filteredArticles, category === 'politics' ? 0.66 : undefined);

      // If too few remain after dedupe, fall back to a stricter duplicate definition (keep more distinct headlines)
      if (uniqueArticles.length < 8 && filteredArticles.length > uniqueArticles.length) {
        const reDedupe = dedupeArticles(filteredArticles, 0.80);
        if (reDedupe.length > uniqueArticles.length) {
          uniqueArticles = reDedupe;
        }
      }

      // Boost widely reported stories based on cluster size (how many headlines merged)
      for (const a of uniqueArticles) {
        const c = Math.max(1, a._cluster || 1);
        // Soft boost capped to keep variety; e.g., +0.03 per extra source up to +0.15
        const boost = Math.min(0.15, (c - 1) * 0.03);
        a.categoryRelevance = Math.min(1, (a.categoryRelevance || 0.5) + boost);
      }
      // Clean temp token storage
      uniqueArticles = uniqueArticles.map(a => { const { _toks, ...rest } = a; return rest; });

      // Diversity controls: (1) per-source caps, (2) sports variety
      const take = Math.max(8, Math.min(40, Number(limit) || 20));

      // Light per-source cap to reduce single-outlet dominance
      const perSourceCap = category === 'sports' ? 3 : 4;
      const bySourceCount = new Map<string, number>();
      const sourceCapped: Article[] = [];
      
      for (const a of uniqueArticles) {
        const src = (a.source || domainFromLink(a.link) || '').toLowerCase();
        const c = bySourceCount.get(src) || 0;
        if (c >= perSourceCap) continue;
        bySourceCount.set(src, c + 1);
        sourceCapped.push(a);
      }

      // If still too few items survived, relax the cap to keep variety
      let diversified = sourceCapped.length < 8 ? uniqueArticles : sourceCapped;
      
      if (category === 'sports') {
        // Assign sport types
        const detectType = (art: Article): string => {
          const txt = `${art.title || ''} ${art.snippet || ''}`.toLowerCase();
          for (const [type, keywords] of Object.entries(SPORT_TYPES)) {
            if (keywords.some((k) => txt.includes(k))) return type;
          }
          return 'other';
        };
        
        const buckets: SportBuckets = {};
        for (const a of sourceCapped) {
          const t = detectType(a);
          (buckets[t] ||= []).push(a);
        }
        
        // Cap American football to 1-2 depending on take
        const maxNFL = take >= 24 ? 2 : 1;
        const result: Article[] = [];
        
        const pushSome = (arr: Article[], n: number) => {
          for (const x of arr) { 
            if (result.length >= take) break; 
            if (n-- <= 0) break; 
            result.push(x); 
          }
        };
        
        // Prioritize a mix: soccer, basketball, tennis, motorsport, cricket, golf, hockey, others
        const order = ['soccer','basketball','tennis','motorsport','cricket','golf','hockey','mma','boxing','athletics','cycling','rugby','winter','olympics','baseball','other'];
        
        // First add at most maxNFL
        pushSome(buckets.american_football || [], maxNFL);
        
        // Then round-robin through the rest
        let round = 0;
        while (result.length < take && round < 10) {
          for (const key of order) {
            const arr = buckets[key] || [];
            if (arr.length) {
              result.push(arr.shift()!);
              if (result.length >= take) break;
            }
          }
          round++;
        }
        
        // Fill remaining slots from any leftovers
        if (result.length < take) {
          const leftovers = Object.values(buckets).flat();
          for (const x of leftovers) { 
            if (result.length >= take) break; 
            result.push(x); 
          }
        }
        
        diversified = result;
      }

      const topItems = diversified.slice(0, take);
      requestLog.info('articles scored & deduped', { filtered: filteredArticles.length, unique: uniqueArticles.length, take });

      if (topItems.length === 0) {
        const details = { urls, perFeedCounts };
        requestLog.warn('no articles after filtering/dedupe', details);
        const payload404: ApiResponse = { ok: false, error: "No recent items found for that selection.", details: JSON.stringify(details) };
        return { status: 404, payload: payload404 };
      }

      const regionCfg = getRegionConfig(region, language);
      const regionName = regionCfg.name;
      const catName = (category || "Top").replace(/^\w/, (c) => c.toUpperCase());

      // Cap the number of context lines and shorten snippets to reduce prompt size
      const MAX_CONTEXT_ITEMS = 8; // smaller window reduces prompt tokens and latency
      const contextItems = topItems.slice(0, Math.min(MAX_CONTEXT_ITEMS, topItems.length));
      const contextLines = contextItems.map((a, i) => {
        const dateStr = a.isoDate
          ? new Date(a.isoDate).toLocaleString(uiLocale, { dateStyle: 'medium', timeStyle: 'short' })
          : "";
        const snip = truncate((a.snippet || "").replace(/\s+/g, " "), 120);
        return `#${i + 1} ${a.title}\nSource: ${a.source} | Published: ${dateStr}\nLink: ${a.link}\nSummary: ${snip}`;
      });

      // Clean up articles for response (remove internal scoring)
      const cleanTopItems = topItems.map(({ categoryRelevance, _localMatch, _cluster, _toks, ...article }) => article);

      // Map length to TL;DR and bullet preferences
      const lengthPreset = (typeof length === 'string' ? length : 'medium').toLowerCase();
      const lengthConfig: LengthConfig = {
        short: { tldrSentences: '1 sentence', bulletsMin: 4, bulletsMax: 6 },
        medium: { tldrSentences: '2–3 sentences', bulletsMin: 6, bulletsMax: 9 },
        long: { tldrSentences: '4–5 sentences', bulletsMin: 8, bulletsMax: 12 },
        'very-long': { tldrSentences: '6–8 sentences', bulletsMin: 10, bulletsMax: 16 }
      }[lengthPreset] || { tldrSentences: '1–2 sentences', bulletsMin: 6, bulletsMax: 9 };

      // Determine bullet count target using available items but bounded by length config
      const baseBullets = take >= 30 ? take / 3 : take / 2.5; // scale gently with available items
      const suggestedBullets = Math.round(
        Math.min(
          lengthConfig.bulletsMax,
          Math.max(lengthConfig.bulletsMin, baseBullets)
        )
      );

      const prompt = buildPrompt({
        regionName,
        catName,
        maxAge,
        style,
        language,
        uiLocale,
        lengthPreset,
        lengthConfig: { ...lengthConfig, bulletsMin: lengthConfig.bulletsMin, bulletsMax: lengthConfig.bulletsMax },
        contextLines
      }).replace(
        /Then provide .* bulleted key takeaways/,
        `Then provide ${suggestedBullets} bulleted key takeaways`
      );

      const stopLLM = logger.startTimer('llm generate', { model: GEMINI_MODEL, style, bullets: suggestedBullets });
      let summary: string;
      try {
        // First attempt: generous timeout
        summary = await withTimeout(generateSummary({ prompt, style }), Math.max(REQUEST_TIMEOUT_MS - 5000, 15000), () => {
          logger.warn('LLM call is slow or hanging, timing out client wait (first attempt)');
        });
      } catch (firstErr: any) {
        logger.warn('LLM first attempt failed or timed out, will retry once', { message: firstErr?.message || String(firstErr) });
        try {
          // Retry once with a shorter timeout to give a second chance without extending total time too much
          summary = await withTimeout(generateSummary({ prompt, style }), 15000, () => {
            logger.warn('LLM call timed out on retry');
          });
        } catch (secondErr: any) {
          logger.error('LLM generation failed or timed out after retry', { first: firstErr?.message || String(firstErr), second: secondErr?.message || String(secondErr) });
            const fallbackLines = topItems.slice(0, Math.max(3, Math.min(10, topItems.length))).map((a, i) => {
              const src = a.source || domainFromLink(a.link) || 'source';
              return `- ${a.title} (${src})\n  ${a.link}`;
            });
            summary = `TL;DR: LLM generation failed or timed out. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
            // Attach error details into payload so Vercel logs include the LLM failure reason for debugging.
            payloadErrorForLogs = (secondErr?.message || firstErr?.message || String(secondErr || firstErr));
        }
      } finally {
        stopLLM();
      }

      // Post-process to remove highly similar/duplicated bullets
      summary = dedupeSummaryBullets(summary);

      const payload: ApiResponse = {
        ok: true,
        meta: {
          region: regionName,
          category: catName,
          style,
          timeframeHours: maxAge,
          language,
          locale: uiLocale,
          usedArticles: cleanTopItems.length,
          model: GEMINI_MODEL,
          length: lengthPreset
        },
        summary
      };
      if (payloadErrorForLogs) {
        (payload as any).llmError = payloadErrorForLogs;
      }
      
      CACHE.set(cacheKey, { ts: Date.now(), payload });
      requestLog.info('response ready', { usedArticles: cleanTopItems.length, model: GEMINI_MODEL, cached: false });
      return { status: 200, payload };
    };

    // In-flight dedupe wrapper
    const getOrCompute = async (key: string): Promise<{ status: number; payload: ApiResponse }> => {
      if (INFLIGHT.has(key)) {
        requestLog.info('awaiting inflight');
        return INFLIGHT.get(key)!;
      }
      const p = (async () => {
        try {
          return await compute();
        } finally {
          INFLIGHT.delete(key);
        }
      })();
      INFLIGHT.set(key, p);
      return p;
    };

    const result = await getOrCompute(cacheKey);
    if (result.status === 404) {
      return res.status(404).json(result.payload);
    }
    return res.status(200).json(result.payload);
  } catch (err: any) {
    logger.error('tldr handler error', { message: err.message, stack: err.stack });
    // Map our internal timeout wrapper to a 504 Gateway Timeout so the client
    // can distinguish slow upstreams from other server errors.
    if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('timed out')) {
      return res.status(504).json({ ok: false, error: 'Request timed out', details: err.message });
    }
    return res.status(500).json({ ok: false, error: "Server error", details: err.message });
  }
}

// Optional: increase execution time limit for this function (seconds)
export const config = { maxDuration: 60 };
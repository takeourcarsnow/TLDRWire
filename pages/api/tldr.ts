// Next.js API Route: TL;DR summarizer (modularized)

import type { NextApiRequest, NextApiResponse } from 'next';
import { pickClientLocale, type ParsedLocale } from './locale';
import logger from './logger';
import { getModel, GEMINI_MODEL } from './llm';
import { dedupeSummaryBullets } from './utils';
import { fetchFeeds } from './fetchFeeds';
import { processArticles } from './processArticles';
import { summarizeWithLLM } from './summarize';

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
    fallback?: boolean;
    length: string;
  };
  summary?: string;
}

interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}

const CACHE = new Map<string, CacheEntry>();
// Increase server-side cache TTL to reduce LLM/function invocations from frequent identical requests.
// 15 minutes is a reasonable tradeoff between freshness and cost.
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

const INFLIGHT = new Map<string, Promise<{ status: number; payload: ApiResponse }>>();
// Simple in-memory negative-cache to avoid repeated LLM calls when quota is hit.
// Keyed by a stable string; value is expire timestamp (ms).
const LLM_NEGATIVE_CACHE = new Map<string, number>();
const LLM_NEGATIVE_CACHE_MS = Number(process.env.LLM_NEGATIVE_CACHE_MS || String(1000 * 60 * 20)); // default 20 minutes

// Lightweight per-IP throttle to avoid accidental or malicious tight loops.
// Keyed by client IP (or X-Forwarded-For header when present). Window is small to avoid
// interfering with normal UX but helps reduce rapid repeated invocations.
const LAST_REQUEST_BY_IP = new Map<string, number>();
const IP_THROTTLE_MS = 5 * 1000; // 5 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    // Fast-fail for obvious non-browser/bot traffic to reduce noisy function
    // invocations and logs. This runs before expensive work. We still allow
    // local/dev calls (NODE_ENV !== 'production') to make testing easier.
    try {
      const ua = (req.headers['user-agent'] || '').toString().toLowerCase();
      const xreq = (req.headers['x-requested-with'] || '').toString();
      const isLikelyBot = /bot|crawler|spider|python|aiohttp|curl|monitor|uptime|lambda/i.test(ua);
      if (process.env.NODE_ENV === 'production' && (isLikelyBot || !xreq)) {
        // Minimal log so we can audit later if needed
        logger.warn('fast-rejecting non-browser request', { ua, ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown' });
        return res.status(403).json({ ok: false, error: 'API access restricted' });
      }
    } catch (e) {
      // ignore filter errors and continue
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // In production, restrict API access to requests initiated by the web UI
    // (AJAX requests from the browser). This helps avoid accidental or
    // automated server work on hosted deployments. Development (NODE_ENV !==
    // 'production') is unaffected so local testing and CI can call the API.
    try {
      if (process.env.NODE_ENV === 'production') {
        const xreq = (req.headers['x-requested-with'] || '').toString();
        if (!xreq || xreq.toLowerCase() !== 'xmlhttprequest') {
          return res.status(403).json({ ok: false, error: 'API access restricted: must originate from UI' });
        }
      }
    } catch (e) { /* ignore header check failures */ }

    if (!getModel()) {
      return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY missing. Configure it in Vercel Project Settings > Environment Variables.' });
    }

    let body: RequestBody = req.body;
    if (!body) {
      try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
    } else if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const {
      region = 'global',
      category = 'top',
      style = 'neutral',
      timeframeHours = 24,
      limit = 20,
      language: bodyLanguage,
      locale: bodyLocale,
      query = '',
      length = 'medium'
    } = (body || {});

    const acceptLanguage = (Array.isArray(req.headers['accept-language']) ? req.headers['accept-language'][0] : req.headers['accept-language']) || (Array.isArray(req.headers['Accept-Language']) ? req.headers['Accept-Language'][0] : req.headers['Accept-Language']);
    const localePref: ParsedLocale = pickClientLocale({ bodyLocale, bodyLanguage, acceptLanguage });
    const language = (localePref.language || 'en');
    const uiLocale = localePref.normalized;

    const cacheKey = JSON.stringify({ region, category, style, timeframeHours, limit, language, query, length, uiLocale });
    const requestLog = logger.child({ route: '/api/tldr', region, category, style, timeframeHours, limit, language, query, length, uiLocale });

    // Log basic request source info for diagnostics (don't log sensitive headers)
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
      const ua = (req.headers['user-agent'] || '<no-ua>') as string;
      requestLog.info('request received', { ip, userAgent: ua });

      // Helpful temporary debugging: if the request looks like a bot or lacks
      // typical browser headers (Origin/Referer or X-Requested-With), log a
      // truncated snapshot of headers and body so we can inspect Vercel logs.
      // This is conservative and intentionally truncates the body to avoid
      // logging large payloads or secrets.
      try {
        const origin = (req.headers['origin'] || req.headers['referer'] || '').toString();
        const xreq = (req.headers['x-requested-with'] || '').toString();
        const uaLc = ua.toLowerCase();
        const looksLikeBot = /bot|crawler|spider|python|aiohttp|fetch/i.test(uaLc) || !origin || (!xreq && process.env.NODE_ENV === 'production');
        if (looksLikeBot) {
          // Build a compact headers map with common keys
          const hdrs: Record<string,string> = {};
          ['user-agent','x-forwarded-for','origin','referer','host','accept','content-type','x-requested-with'].forEach((k) => {
            try { const v = req.headers[k as keyof typeof req.headers]; if (v) hdrs[k] = Array.isArray(v) ? v[0] : String(v); } catch (e) {}
          });
          const rawBody = (() => {
            try { const b = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}); return b.slice(0, 1024); } catch (e) { return '<body-read-error>'; }
          })();
          requestLog.warn('suspicious request (bot-like or missing browser headers)', { ip, ua: uaLc, origin, xRequestedWith: xreq, headers: hdrs, bodySnippet: rawBody });
        }
      } catch (e) { /* ignore any logging errors */ }
    } catch (e) {
      requestLog.info('request received');
    }

    // Optional stricter origin/referrer validation. If you set NEXT_PUBLIC_ALLOWED_ORIGIN
    // in Vercel (for example: https://tldrwire.xyz) the server will enforce that the
    // request's Origin or Referer includes that value. When not set, legacy behavior
    // (X-Requested-With header check) remains unchanged.
    try {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOWED_ORIGIN) {
        const allowed = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN;
        const origin = (req.headers['origin'] || req.headers['referer'] || '').toString();
        if (!origin || origin.indexOf(allowed) === -1) {
          requestLog.warn('request rejected: origin/referrer mismatch', { origin, allowed });
          return res.status(403).json({ ok: false, error: 'API access restricted: invalid origin' });
        }
      }
    } catch (e) {
      // If validation throws for any reason, fall back to the existing header check below
    }

    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      requestLog.info('cache hit', { ageMs: Date.now() - cached.ts });
      return res.status(200).json({ cached: true, ...cached.payload });
    }

    // Per-IP quick throttle: detect same-client rapid repeats and reject early.
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
      const last = LAST_REQUEST_BY_IP.get(ip) || 0;
      const now = Date.now();
      LAST_REQUEST_BY_IP.set(ip, now);
      if (now - last < IP_THROTTLE_MS) {
        requestLog.warn('client request throttled (too frequent)', { ip, sinceLastMs: now - last });
        return res.status(429).json({ ok: false, error: 'Too many requests; slow down a little' });
      }
    } catch (e) {
      // ignore any errors in throttle bookkeeping
    }

    const compute = async (): Promise<{ status: number; payload: ApiResponse }> => {
  // Hint to fetchFeeds how many items we ultimately need so it can stop early once
  // enough articles are gathered. This reduces upstream load and latency.
  const feeds = await fetchFeeds({ region, category, query, hours: timeframeHours, language, loggerContext: { uiLocale }, maxFeeds: 16, desiredItems: Math.max(8, limit) });

    // Pass the requested timeframe (in hours) to processArticles so it filters by the
    // user's desired window. processArticles will cap this to the default maximum (7 days).
    const processed = await processArticles({ feedsResult: feeds, maxArticles: limit, region, category, query, loggerContext: { uiLocale }, maxAgeHours: timeframeHours });
  const { topItems, cleanTopItems, maxAge } = processed;
  // processArticles returns maxAge in milliseconds (used for filtering). Convert to hours
  // for use in prompts and API metadata so the UI shows a human-friendly hours value.
  const maxAgeHours = Math.max(1, Math.round(Number(maxAge || 0) / (1000 * 60 * 60)));

      if (topItems.length === 0) {
        requestLog.warn('no articles after filtering/dedupe', { urls: feeds.urls, perFeedCounts: feeds.perFeedCounts, perFeedErrors: feeds.perFeedErrors });
        const fallbackLines = feeds.urls.slice(0, 20).map((u: string, i: number) => `- ${u}`);
        const summary = `TL;DR: Could not reliably fetch recent items for that selection. Showing attempted feed URLs instead (first 20):\n\n${fallbackLines.join('\n')}`;
        const payloadFallback: ApiResponse = {
          ok: true,
          meta: {
            region: region,
            category: (category || 'Top'),
            style,
            timeframeHours: maxAgeHours,
            language,
            locale: uiLocale,
            usedArticles: 0,
            model: GEMINI_MODEL,
            length: (typeof length === 'string' ? length : 'medium')
          },
          summary
        };
        CACHE.set(cacheKey, { ts: Date.now(), payload: payloadFallback });
        return { status: 200, payload: payloadFallback };
      }

      const regionCfg = (await import('./feeds')).getRegionConfig(region, language);
      const regionName = regionCfg.name;
      const catName = (category || 'Top').replace(/^\w/, (c) => c.toUpperCase());

  const MAX_CONTEXT_ITEMS = 8;
      const contextItems = topItems.slice(0, Math.min(MAX_CONTEXT_ITEMS, topItems.length));
  const contextLines = contextItems.map((a: any, idx: number) => {
    const dateStr = a.isoDate ? new Date(a.isoDate).toLocaleString(uiLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const snip = (a.snippet || '').replace(/\s+/g, ' ');
        return `#${idx + 1} ${a.title}\nSource: ${a.source} | Published: ${dateStr}\nLink: ${a.link}\nSummary: ${snip}`;
      });

      const lengthPreset = (typeof length === 'string' ? length : 'medium').toLowerCase();
      const lengthConfig = {
        short: { tldrSentences: '1 sentence', bulletsMin: 4, bulletsMax: 6 },
        medium: { tldrSentences: '2–3 sentences', bulletsMin: 6, bulletsMax: 9 },
        long: { tldrSentences: '4–5 sentences', bulletsMin: 8, bulletsMax: 12 },
        'very-long': { tldrSentences: '6–8 sentences', bulletsMin: 10, bulletsMax: 16 }
      }[lengthPreset] || { tldrSentences: '1–2 sentences', bulletsMin: 6, bulletsMax: 9 };

      // If LLM usage is temporarily disabled via env or negative-cache (quota hit),
      // skip the call and return a fast extractive fallback to avoid consuming quota.
      const llmCacheKey = 'gemini_quota';
      const now = Date.now();
      const negativeExpire = LLM_NEGATIVE_CACHE.get(llmCacheKey) || 0;
      let summary: string = '';
      let payloadErrorForLogs: string | undefined;
      let usedLLM = true;
      if (process.env.SERVER_DISABLE_LLM === 'true' || negativeExpire > now) {
        // Build a conservative extractive fallback from top context lines
        usedLLM = false;
        const fallbackLines = (contextLines || []).slice(0, Math.max(3, Math.min(Math.round(Math.min(lengthConfig.bulletsMax, Math.max(lengthConfig.bulletsMin, 6))), 6))).map((l) => `- ${l.split('\n')[0]}`);
        summary = `TL;DR: LLM unavailable or temporarily disabled. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
      } else {
        const res = await summarizeWithLLM({ regionName, catName, maxAge: maxAgeHours, style, language, uiLocale, lengthPreset, lengthConfig, contextLines });
        summary = res.summary;
        if (res.llmError) payloadErrorForLogs = res.llmError;
      }

      // Append source attribution to the summary
      let finalSummary = dedupeSummaryBullets(summary);
      // Compute sources from the final articles used
      const hostCounts: Record<string, number> = {};
      for (const a of cleanTopItems) {
        let host = '';
        try { host = new URL(a.url).hostname; } catch { host = 'unknown'; }
        host = host.toLowerCase().replace(/^www\./, ''); // normalize
        hostCounts[host] = (hostCounts[host] || 0) + 1;
      }
      const topSources = Object.entries(hostCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([host,count]) => `${host} (${count})`).join(', ');
      if (topSources) {
        finalSummary += `\n\nSources: ${topSources}`;
      }

      const payload: ApiResponse = {
        ok: true,
        meta: {
          region: regionName,
          category: catName,
          style,
          timeframeHours: maxAgeHours,
          language,
          locale: uiLocale,
          usedArticles: cleanTopItems.length,
          model: usedLLM ? GEMINI_MODEL : 'fallback',
          fallback: !usedLLM,
          length: lengthPreset
        },
        summary: finalSummary
      };
      if (payloadErrorForLogs) {
        (payload as any).llmError = payloadErrorForLogs;
        // If the LLM error looks like a quota issue, set negative-cache so subsequent
        // requests in the near term don't call the LLM and instead use an extractive fallback.
        try {
          if (/quota|too many requests|429/i.test(payloadErrorForLogs)) {
            LLM_NEGATIVE_CACHE.set('gemini_quota', Date.now() + LLM_NEGATIVE_CACHE_MS);
            requestLog.warn('LLM quota detected; negative-cache enabled', { ttlMs: LLM_NEGATIVE_CACHE_MS });
          }
        } catch (e) { /* ignore cache errors */ }
      }
      CACHE.set(cacheKey, { ts: Date.now(), payload });
      requestLog.info('response ready', { usedArticles: cleanTopItems.length, model: GEMINI_MODEL, cached: false });
      requestLog.info('final articles used for summary', { count: cleanTopItems.length });
      return { status: 200, payload };
    };

    const getOrCompute = async (key: string): Promise<{ status: number; payload: ApiResponse }> => {
      if (INFLIGHT.has(key)) {
        requestLog.info('awaiting inflight');
        return INFLIGHT.get(key)!;
      }
      const p = (async () => { try { return await compute(); } finally { INFLIGHT.delete(key); } })();
      INFLIGHT.set(key, p);
      return p;
    };

    const result = await getOrCompute(cacheKey);
    if (result.status === 404) return res.status(404).json(result.payload);
    return res.status(200).json(result.payload);
  } catch (err: any) {
    logger.error('tldr handler error', { message: err?.message, stack: err?.stack });
    if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('timed out')) {
      return res.status(504).json({ ok: false, error: 'Request timed out', details: err.message });
    }
    return res.status(500).json({ ok: false, error: 'Server error', details: err?.message });
  }
}

export const config = { maxDuration: 60 };
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
    length: string;
  };
  summary?: string;
}

interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 3; // 3 minutes

const INFLIGHT = new Map<string, Promise<{ status: number; payload: ApiResponse }>>();

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

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
    requestLog.info('request received');

    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      requestLog.info('cache hit', { ageMs: Date.now() - cached.ts });
      return res.status(200).json({ cached: true, ...cached.payload });
    }

    const compute = async (): Promise<{ status: number; payload: ApiResponse }> => {
      let payloadErrorForLogs: string | undefined = undefined;
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
        const dateStr = a.isoDate ? new Date(a.isoDate).toLocaleString(uiLocale, { dateStyle: 'medium', timeStyle: 'short' }) : '';
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

  const { summary, llmError } = await summarizeWithLLM({ regionName, catName, maxAge: maxAgeHours, style, language, uiLocale, lengthPreset, lengthConfig, contextLines });
      if (llmError) payloadErrorForLogs = llmError;

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
          model: GEMINI_MODEL,
          length: lengthPreset
        },
        summary: finalSummary
      };
      if (payloadErrorForLogs) (payload as any).llmError = payloadErrorForLogs;
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
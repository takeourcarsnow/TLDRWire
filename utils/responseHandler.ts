import { getModel, GEMINI_MODEL } from '../pages/api/llm';
import { dedupeSummaryBullets } from '../pages/api/utils';
import { fetchFeeds } from '../pages/api/fetchFeeds';
import { processArticles } from '../pages/api/processArticles';
import { summarizeWithLLM } from '../pages/api/summarize';
import { getRegionConfig } from '../pages/api/feeds';
import { LENGTH_CONFIGS } from '../pages/api/uiConstants';
import { ApiResponse } from '../types/tldr';
import { cacheManager, NEGATIVE_CACHE_TTL } from './cacheManager';

export const responseHandler = {
  checkCache: (cacheKey: string): ApiResponse | null => {
    const cached = cacheManager.get(cacheKey);
    if (cached && !cacheManager.isExpired(cached)) {
      return { cached: true, ...cached.payload };
    }
    return null;
  },

  checkThrottle: (ip: string, requestLog: any): { throttled: boolean; error?: ApiResponse } => {
    const { throttled, sinceLastMs } = cacheManager.checkThrottle(ip);
    if (throttled) {
      requestLog.warn('client request throttled (too frequent)', { ip, sinceLastMs });
      return {
        throttled: true,
        error: { ok: false, error: 'Too many requests; slow down a little' }
      };
    }
    return { throttled: false };
  },

  computeResponse: async (params: {
    region: string;
    category: string;
    style: string;
    timeframeHours: number;
    limit: number;
    language: string;
    uiLocale: string;
    length: string;
    cacheKey: string;
    requestLog: any;
  }): Promise<{ status: number; payload: ApiResponse }> => {
    const { region, category, style, timeframeHours, limit, language, uiLocale, length, cacheKey, requestLog } = params;

    // Fetch feeds
    const feeds = await fetchFeeds({
      region,
      category,
      query: '',
      hours: timeframeHours,
      language,
      loggerContext: { uiLocale },
      maxFeeds: 16,
      desiredItems: Math.max(8, limit)
    });

    // Process articles
    const processed = await processArticles({
      feedsResult: feeds,
      maxArticles: limit,
      region,
      category,
      query: '',
      loggerContext: { uiLocale },
      maxAgeHours: timeframeHours,
      enableImageScraping: process.env.ENABLE_IMAGE_SCRAPING === 'true'
    });

    const { topItems, cleanTopItems, maxAge } = processed;
    const maxAgeHours = Math.max(1, Math.round(Number(maxAge || 0) / (1000 * 60 * 60)));

    // Handle no articles case
    if (topItems.length === 0) {
      requestLog.warn('no articles after filtering/dedupe', {
        urls: feeds.urls,
        perFeedCounts: feeds.perFeedCounts,
        perFeedErrors: feeds.perFeedErrors
      });

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

      cacheManager.set(cacheKey, { ts: Date.now(), payload: payloadFallback });
      return { status: 200, payload: payloadFallback };
    }

    // Generate summary
    const regionCfg = getRegionConfig(region, language);
    const regionName = regionCfg.name;
    const catName = (category || 'Top').replace(/^\w/, (c) => c.toUpperCase());

    const MAX_CONTEXT_ITEMS = 8;
    const contextItems = topItems.slice(0, Math.min(MAX_CONTEXT_ITEMS, topItems.length));
    const contextLines = contextItems.map((a: any, idx: number) => {
      const dateStr = a.isoDate ? new Date(a.isoDate).toLocaleString(uiLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const snip = (a.snippet || '').replace(/\s+/g, ' ');
      let line = `#${idx + 1} ${a.title}\nSource: ${a.source} | Published: ${dateStr}\nLink: ${a.link}\nSummary: ${snip}`;
      if (a.imageUrl) {
        line += `\nImage: ![${a.title}](${a.imageUrl})`;
      }
      return line;
    });

    const lengthPreset = (typeof length === 'string' ? length : 'medium').toLowerCase();
    const lengthConfig = LENGTH_CONFIGS[lengthPreset as keyof typeof LENGTH_CONFIGS] || LENGTH_CONFIGS.medium;

    // Check LLM availability
    const llmCacheKey = 'gemini_quota';
    const now = Date.now();
    const negativeExpire = cacheManager.getNegativeCache(llmCacheKey) || 0;
    let summary: string = '';
    let payloadErrorForLogs: string | undefined;
    let usedLLM = true;

    if (process.env.SERVER_DISABLE_LLM === 'true' || negativeExpire > now) {
      usedLLM = false;
      const fallbackLines = (contextLines || []).slice(0, Math.max(3, Math.min(Math.round(Math.min(lengthConfig.bulletsMax, Math.max(lengthConfig.bulletsMin, 6))), 6))).map((l) => `- ${l.split('\n')[0]}`);
      summary = `TL;DR: LLM unavailable or temporarily disabled. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
    } else {
      const res = await summarizeWithLLM({ regionName, catName, maxAge: maxAgeHours, style, language, uiLocale, lengthPreset, lengthConfig, contextLines });
      summary = res.summary;
      if (res.llmError) payloadErrorForLogs = res.llmError;
    }

    // Finalize summary with deduplication and sources
    let finalSummary = dedupeSummaryBullets(summary);

    const hostCounts: Record<string, number> = {};
    for (const a of cleanTopItems) {
      let host = '';
      try { host = new URL(a.url).hostname; } catch { host = 'unknown'; }
      host = host.toLowerCase().replace(/^www\./, '');
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
      summary: finalSummary,
      images: cleanTopItems.filter(a => a.imageUrl !== null).map(a => ({ title: a.title, url: a.url, imageUrl: a.imageUrl! }))
    };

    if (payloadErrorForLogs) {
      (payload as any).llmError = payloadErrorForLogs;
      // Handle quota issues
      try {
        if (/quota|too many requests|429/i.test(payloadErrorForLogs)) {
          cacheManager.setNegativeCache('gemini_quota', Date.now() + NEGATIVE_CACHE_TTL);
          requestLog.warn('LLM quota detected; negative-cache enabled', { ttlMs: NEGATIVE_CACHE_TTL });
        }
      } catch (e) { /* ignore cache errors */ }
    }

    cacheManager.set(cacheKey, { ts: Date.now(), payload });
    requestLog.info('response ready', { usedArticles: cleanTopItems.length, model: GEMINI_MODEL, cached: false });
    requestLog.info('final articles used for summary', { count: cleanTopItems.length });

    return { status: 200, payload };
  },

  getOrCompute: async (cacheKey: string, computeFn: () => Promise<{ status: number; payload: ApiResponse }>): Promise<{ status: number; payload: ApiResponse }> => {
    const inflight = cacheManager.getInflight(cacheKey);
    if (inflight) {
      return inflight;
    }

    const promise = (async () => {
      try {
        return await computeFn();
      } finally {
        cacheManager.deleteInflight(cacheKey);
      }
    })();

    cacheManager.setInflight(cacheKey, promise);
    return promise;
  }
};
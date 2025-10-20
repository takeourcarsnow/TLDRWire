import { getModel, GEMINI_MODEL } from '../pages/api/llm';
import { dedupeSummaryBullets } from '../pages/api/utils';
import { fetchFeeds } from '../pages/api/fetchFeeds';
import { processArticles } from '../pages/api/processArticles';
import { summarizeWithLLM } from '../pages/api/summarize';
import { getRegionConfig } from '../pages/api/feeds';
import { LENGTH_CONFIGS } from '../pages/api/uiConstants';
import { ApiResponse } from '../types/tldr';
import { cacheManager, NEGATIVE_CACHE_TTL } from './cacheManager';
import { buildContextItemsAndLines, insertImagesIntoSummary, computeTopSources, createFallbackPayload } from './responseUtils';
import { summarizeWithPossibleFallback } from './llmWrapper';
import { translateTitles } from './llmClient';

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

    const totalTimer = requestLog.startTimer('total summary generation', { region, category, style });

    // Fetch feeds
    const fetchTimer = requestLog.startTimer('feed fetching', { region, category });
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
    fetchTimer();

    // Process articles
    const processTimer = requestLog.startTimer('article processing', { region, category, enableImageScraping: process.env.ENABLE_IMAGE_SCRAPING === 'true' });
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
    processTimer();

    const { topItems, cleanTopItems, maxAge } = processed;
    const maxAgeHours = Math.max(1, Math.round(Number(maxAge || 0) / (1000 * 60 * 60)));

    // Handle no articles case
    if (topItems.length === 0) {
      requestLog.warn('no articles after filtering/dedupe', {
        urls: feeds.urls,
        perFeedCounts: feeds.perFeedCounts,
        perFeedErrors: feeds.perFeedErrors
      });

      const payloadFallback = createFallbackPayload(feeds, region, category, style, uiLocale, language, length, GEMINI_MODEL);
      cacheManager.set(cacheKey, { ts: Date.now(), payload: payloadFallback });
      return { status: 200, payload: payloadFallback };
    }

    // Translate titles to the chosen language if not English
    let translatedTopItems = topItems;
    let translatedCleanTopItems = cleanTopItems;
    if (language !== 'en') {
      const titles = topItems.map(item => item.title);
      const translatedTitles = await translateTitles(titles, language);
      translatedTopItems = topItems.map((item, idx) => ({
        ...item,
        title: translatedTitles[idx] || item.title
      }));
      translatedCleanTopItems = cleanTopItems.map((item, idx) => ({
        ...item,
        title: translatedTitles[idx] || item.title
      }));
    }

    // Generate summary
    const regionCfg = getRegionConfig(region, language);
    const regionName = regionCfg.name;
    const catName = (category || 'Top').replace(/^\w/, (c) => c.toUpperCase());

    const { contextItems, contextLines } = buildContextItemsAndLines(translatedTopItems, uiLocale);

    const lengthPreset = (typeof length === 'string' ? length : 'medium').toLowerCase();
    const lengthConfig = LENGTH_CONFIGS[lengthPreset as keyof typeof LENGTH_CONFIGS] || LENGTH_CONFIGS.medium;

    const { summary, usedLLM, llmError } = await summarizeWithPossibleFallback({ regionName, catName, maxAge: maxAgeHours, style, language, uiLocale, lengthPreset, lengthConfig, contextLines, requestLog });
    let payloadErrorForLogs = llmError;

    // Finalize summary with deduplication and sources
    const finalizeTimer = requestLog.startTimer('summary finalization', { region, category });
    let finalSummary = summary; // Skip deduplication for new format
    // let finalSummary = dedupeSummaryBullets(summary);

    // Images are now included directly in the LLM response, no need to insert them
    // finalSummary = insertImagesIntoSummary(finalSummary, contextItems);

    // const topSources = computeTopSources(cleanTopItems);
    // if (topSources) {
    //   const sourcesWithLinks = topSources.split(', ').map(s => {
    //     const parts = s.split(' ');
    //     const host = parts[0];
    //     const count = parts.slice(1).join(' ');
    //     return `[${host}](https://${host}) ${count}`;
    //   }).join(', ');
    //   finalSummary += `\n\nSources: ${sourcesWithLinks}`;
    // }
    finalizeTimer();

    const payload: ApiResponse = {
      ok: true,
      meta: {
        region: regionName,
        category: catName,
        style,
        timeframeHours: maxAgeHours,
        language,
        locale: uiLocale,
        usedArticles: translatedCleanTopItems.length,
        model: usedLLM ? GEMINI_MODEL : 'fallback',
        fallback: !usedLLM,
        length: lengthPreset
      },
      summary: finalSummary,
      images: translatedCleanTopItems.filter(a => a.imageUrl !== null).map(a => ({ title: a.title, url: a.url, imageUrl: a.imageUrl! })),
      articles: translatedCleanTopItems.map(a => ({
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source,
        imageUrl: a.imageUrl
      }))
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
    requestLog.info('response ready', { usedArticles: translatedCleanTopItems.length, model: GEMINI_MODEL, cached: false });
    requestLog.info('final articles used for summary', { count: translatedCleanTopItems.length });

    totalTimer();
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
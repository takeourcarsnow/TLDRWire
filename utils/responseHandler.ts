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
        line += `\n![${a.title}](${a.imageUrl})`;
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
      const summaryTimer = requestLog.startTimer('summary generation', { region, category, style, usedLLM: true });
      const res = await summarizeWithLLM({ regionName, catName, maxAge: maxAgeHours, style, language, uiLocale, lengthPreset, lengthConfig, contextLines });
      summary = res.summary;
      if (res.llmError) payloadErrorForLogs = res.llmError;
      summaryTimer();
    }

    // Finalize summary with deduplication and sources
    const finalizeTimer = requestLog.startTimer('summary finalization', { region, category });
    let finalSummary = dedupeSummaryBullets(summary);

    // Collect existing images in the summary to avoid duplicates
    const existingImages = new Set<string>();
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(finalSummary)) !== null) {
      existingImages.add(match[1]);
    }

    // Insert images inline after bullet headlines
    // Parse the summary to find bullets and insert images for articles that have them
    const lines = finalSummary.split('\n');
    const result: string[] = [];
    const usedImages = new Set<string>(); // Track used images to prevent duplicates
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      result.push(line);
      
      // Check if this line is a bullet
      if (line.match(/^(\s*[-*]\s+)(.+)$/)) {
        // Find the best matching article with an image that hasn't been used yet
        let bestMatch = null;
        let bestScore = 0;
        
        for (const article of cleanTopItems) {
          if (!article.imageUrl || usedImages.has(article.imageUrl)) continue;
          
          // Calculate similarity score based on title overlap
          const bulletText = line.replace(/^(\s*[-*]\s+)/, '').toLowerCase();
          const articleTitle = (article.title || '').toLowerCase();
          
          // Simple word overlap score
          const bulletWords = bulletText.split(/\s+/);
          const titleWords = articleTitle.split(/\s+/);
          const overlap = bulletWords.filter(word => 
            word.length > 3 && titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
          ).length;
          
          const score = overlap / Math.max(bulletWords.length, titleWords.length);
          
          if (score > bestScore && score > 0.3) { // Minimum threshold
            bestScore = score;
            bestMatch = article;
          }
        }
        
        if (bestMatch && !existingImages.has(bestMatch.imageUrl!)) {
          // Insert image after the bullet and mark it as used
          result.push(`![${bestMatch.title.replace(/[\[\]]/g, '')}](${bestMatch.imageUrl})`);
          usedImages.add(bestMatch.imageUrl!);
        }
      }
    }
    
    finalSummary = result.join('\n');

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
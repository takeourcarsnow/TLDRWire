import logger from './logger';
import { getAllFeedsWithFallbacks, resolveCategory } from './feeds';
import { FALLBACK_FEEDS } from './constants';
import { fetchWithRetries } from './fetcher';

export type FetchFeedsResult = {
  items: any[];
  urls: string[];
  perFeedCounts: number[];
  perFeedErrors: Array<string | null>;
  usedFallbacks: boolean;
  topHosts: Array<{ host: string; count: number }>;
};

export async function fetchFeeds(opts: {
  region: string;
  category: string;
  query: string;
  hours: number;
  language: string;
  loggerContext?: any;
  maxFeeds?: number;
  // optional hint: stop fetching once this many items have been gathered
  desiredItems?: number;
}): Promise<FetchFeedsResult> {
  const { region, category, query, hours, language, loggerContext, maxFeeds = 16 } = opts;
  const desiredItems = (opts as any).desiredItems || 0;
  const requestLog = logger.child({ route: '/api/tldr/fetchFeeds', region, category, hours, language, query, ...(loggerContext || {}) });

  const urls = getAllFeedsWithFallbacks({ region, category, query, hours, lang: language }, maxFeeds);
  requestLog.debug('feed urls built', { urls, sampleUrl: urls[0] });
  requestLog.info('feeds to consider', { count: urls.length, sample: urls.slice(0, 6) });
  // regionCfgForLinks previously used for link normalization; safe to remove until needed

  // Limit feeds and deprioritize google news
  let urlsToFetch = urls;
  const MAX_FEEDS = maxFeeds;
  // If Lithuania, ensure some Delfi fallback feeds are included at the front so we fetch them
  try {
    if ((region || '').toLowerCase() === 'lithuania') {
      const ltFallbacks = FALLBACK_FEEDS['lithuania'] || [];
      const delfiFallbacks = ltFallbacks.filter(u => typeof u === 'string' && u.includes('delfi'));
      // prepend up to two Delfi fallbacks if they aren't already present
      for (const u of delfiFallbacks.slice(0, 2).reverse()) {
        if (!urlsToFetch.includes(u)) {
          urlsToFetch = [u, ...urlsToFetch];
        }
      }
      if (delfiFallbacks.length) requestLog.info('prepended delfi fallback feeds for lithuania', { delfiFallbacks: delfiFallbacks.slice(0,2) });
    }
  } catch (e) { /* ignore */ }
  if (urlsToFetch.length > MAX_FEEDS) {
    requestLog.info('too many feeds, sampling to reduce upstream load', { originalCount: urlsToFetch.length, max: MAX_FEEDS });
    const keep = urlsToFetch.slice(0, Math.min(4, urlsToFetch.length));
    const rest = urlsToFetch.slice(keep.length);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    urlsToFetch = [...keep, ...rest.slice(0, Math.max(0, MAX_FEEDS - keep.length))];
  }

  try {
    const googleUrls: string[] = [];
    const regionFallbackUrls: string[] = [];
    const otherUrls: string[] = [];
    const regionKey = (region || '').toLowerCase();
    const regionFallbacks = regionKey && FALLBACK_FEEDS[regionKey] ? FALLBACK_FEEDS[regionKey] : [];

    for (const u of urlsToFetch) {
      try { const h = new URL(u).hostname; if (h && h.includes('news.google.com')) { googleUrls.push(u); continue; } } catch { /* ignore malformed URL */ }
      if (typeof u === 'string' && u.includes('news.google.com')) { googleUrls.push(u); continue; }
      if (regionFallbacks.includes(u)) { regionFallbackUrls.push(u); continue; }
      otherUrls.push(u);
    }
    if (googleUrls.length) {
      // Always deprioritize Google News as they are slow and buggy
      requestLog.info('deprioritizing google news feeds', { googleCount: googleUrls.length, total: urlsToFetch.length });
      urlsToFetch = [...regionFallbackUrls, ...otherUrls, ...googleUrls];
    } else {
      urlsToFetch = [...regionFallbackUrls, ...otherUrls];
    }
    if (regionFallbackUrls.length) {
      requestLog.info('prioritized region-specific fallback feeds', { regionFallbackCount: regionFallbackUrls.length, region });
    }
    // Log final fetch order for visibility
    requestLog.info('final fetch order', { count: urlsToFetch.length, order: urlsToFetch.slice(0, 40) });
  } catch (e) { /* ignore grouping errors */ }

  // Higher concurrency helps when many non-google publisher feeds are available.
  // Keep it modest to avoid hammering origins in dev; can be tuned via env later.
  const concurrency = Math.min(4, urlsToFetch.length);
  const results: Array<any> = new Array(urlsToFetch.length);
  let workerIndex = 0;
  let stopFetching = false;
  let aggregatedItemsCount = 0;
  const controllers: Array<AbortController | null> = new Array(urlsToFetch.length).fill(null);
  let abortedControllers = 0;
  let completedFeeds = 0;

  // delegate actual fetching to fetcher module which uses shared caches

  const worker = async () => {
    // loop until all feeds fetched or aborted
    for (;;) {
      if (stopFetching) break;
      const i = workerIndex++;
      if (i >= urlsToFetch.length) break;
      if (stopFetching) break;
      const u = urlsToFetch[i];
      try {
        const ctrl = new AbortController();
        controllers[i] = ctrl;
        results[i] = await fetchWithRetries(u, requestLog, { signal: ctrl.signal });
      } catch (e:any) { results[i] = { status: 'rejected', reason: e }; }
      completedFeeds++;
      // If we have a hint about how many items we need, stop early once reached, but only after trying at least 3 feeds.
      try {
        const r = results[i];
        if (desiredItems > 0 && completedFeeds >= 3 && r && r.status === 'fulfilled' && Array.isArray(r.value?.items)) {
          // Calculate total items from all completed feeds
          const totalItems = results.reduce((sum, res) => {
            if (res && res.status === 'fulfilled' && Array.isArray(res.value?.items)) {
              return sum + (res.value.items.length || 0);
            }
            return sum;
          }, 0);
          if (totalItems >= desiredItems) {
            stopFetching = true;
            requestLog.info('early stop: enough items gathered, aborting remaining fetches', { desiredItems, aggregatedItemsCount: totalItems, url: u, index: i });
            // Abort any in-flight controllers to cancel network activity and count aborted controllers
            try {
              for (const c of controllers) {
                if (c && !c.signal.aborted) {
                  try { c.abort(); abortedControllers++; } catch (e) { /* ignore */ }
                }
              }
            } catch (e) { /* ignore */ }
            break;
          }
        }
      } catch (e) { /* ignore */ }
    }
  };

  const workersPromise = Promise.all(new Array(Math.min(concurrency, urlsToFetch.length)).fill(0).map(() => worker()));
  // Overall request timeout for feed fetching stage (ms). Lowered to abort earlier when
  // many upstream feeds are slow; still leaves the summarization stage time.
  const REQUEST_TIMEOUT_MS = 30000;
  const feedTimeoutMs = Math.max(REQUEST_TIMEOUT_MS - 8000, 8000);
  let feedTimedOut = false;
  await Promise.race([
    workersPromise,
  new Promise<void>((resolve) => setTimeout(() => { feedTimedOut = true; stopFetching = true; try { logger.warn('Feed fetching taking too long, aborting'); } catch { /* ignore */ }  resolve(); }, feedTimeoutMs))
  ]);
  if (feedTimedOut) {
    // Abort in-flight requests when the overall feed soft-timeout triggers and count aborted controllers
    try {
      for (const c of controllers) {
        if (c && !c.signal.aborted) {
          try { c.abort(); abortedControllers++; } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
    requestLog.warn('feed fetching soft-timeout reached; continuing with partial results', { attempted: urlsToFetch.length, fetched: results.filter(r=>r && r.status === 'fulfilled').length, abortedControllers });
  }

  const perFeedCounts = (results as any[]).map((r: any) => (r && r.status === 'fulfilled' ? (r.value?.items?.length || 0) : -1));
  const perFeedErrors = (results as any[]).map((r: any) => (r && r.status === 'rejected' ? String(r.reason || r.reason?.message || 'unknown') : null));

  let items: any[] = [];
  for (const r of results) {
    if (r && r.status === "fulfilled" && r.value?.items?.length) {
      items.push(...r.value.items);
    }
  }
  requestLog.info('feed items aggregated', { itemCount: items.length });

  let topHosts: Array<{ host: string; count: number }> = [];
  // Detailed per-feed diagnostics for terminal visibility: which URL -> how many items / error
  try {
    const perFeedSummary = urlsToFetch.map((u, i) => {
      let hostname = '';
      try { hostname = new URL(u).hostname; } catch { hostname = u; }
      return { url: u, hostname, count: perFeedCounts[i], error: perFeedErrors[i] };
    });
  requestLog.info('per-feed summary', { perFeedSummary: perFeedSummary.slice(0, 50), abortedControllers });

    // Count item sources by hostname or source string to see which publishers produced articles
    const hostCounts: Record<string, number> = {};
    for (const it of items) {
      let host = '';
      try { host = new URL(it.link).hostname || String(it.source || ''); } catch { host = String(it.source || ''); }
      host = (host || '').toLowerCase();
      if (!host) host = 'unknown';
      hostCounts[host] = (hostCounts[host] || 0) + 1;
    }
    topHosts = Object.entries(hostCounts).sort((a,b) => b[1] - a[1]).slice(0, 12).map(([host,count]) => ({ host, count }));
    requestLog.info('top item sources', { topHosts });
  } catch (e) {
    requestLog.debug('failed to compute per-feed diagnostics', { message: String(e) });
  }

  let usedFallbacks = false;
  if (items.length === 0) {
    try {
      requestLog.info('no items from initial feeds, attempting publisher fallback feeds');
      const categoryKey = resolveCategory(category);
      const categoryFallbacks = FALLBACK_FEEDS[categoryKey] || FALLBACK_FEEDS['top'] || [];
      const regionFallbacks = FALLBACK_FEEDS[region?.toLowerCase()] || [];
      const fallbackUrls = Array.from(new Set([...categoryFallbacks, ...regionFallbacks]));

      if (fallbackUrls.length) {
        usedFallbacks = true;
        requestLog.debug('publisher fallback urls', { count: fallbackUrls.length, urls: fallbackUrls.slice(0, 8) });

        const fbResults: any[] = new Array(fallbackUrls.length);
        let fbIndex = 0;
        const fbControllers: Array<AbortController | null> = new Array(fallbackUrls.length).fill(null);
        const fbWorker = async () => {
          for (;;) {
            const i = fbIndex++;
            if (i >= fallbackUrls.length) break;
            const u = fallbackUrls[i];
            try { const ctrl = new AbortController(); fbControllers[i] = ctrl; fbResults[i] = await fetchWithRetries(u, requestLog, { signal: ctrl.signal }); } catch (e:any) { fbResults[i] = { status: 'rejected', reason: e }; }
          }
        };

        const fbWorkersPromise = Promise.all(new Array(Math.min(concurrency, fallbackUrls.length)).fill(0).map(() => fbWorker()));
        const fbTimeoutMs = Math.max(REQUEST_TIMEOUT_MS - 8000, 8000);
        let fbTimedOut = false;
        await Promise.race([
          fbWorkersPromise,
          new Promise<void>((resolve) => setTimeout(() => { fbTimedOut = true; try { logger.warn('Fallback feed fetching taking too long, aborting'); } catch { /* ignore */ }  resolve(); }, fbTimeoutMs))
        ]);
        if (fbTimedOut) {
          let abortedFallbackControllers = 0;
          try {
            for (const c of fbControllers) {
              if (c && !c.signal.aborted) {
                try { c.abort(); abortedFallbackControllers++; } catch (e) { /* ignore */ }
              }
            }
          } catch (e) { /* ignore */ }
          requestLog.warn('fallback feed fetching soft-timeout reached; continuing with partial fallback results', { attempted: fallbackUrls.length, fetched: fbResults.filter(r=>r && r.status === 'fulfilled').length, abortedFallbackControllers });
        }

        const fbCounts = fbResults.map((r:any) => (r && r.status === 'fulfilled' ? (r.value?.items?.length || 0) : -1));
        const fbErrors = fbResults.map((r:any) => (r && r.status === 'rejected' ? String(r.reason || r.reason?.message || 'unknown') : null));
  requestLog.info('publisher fallback fetch results', { fbCounts, sampleErrors: fbErrors.filter(Boolean).slice(0,5) });

        for (const r of fbResults) {
          if (r && r.status === 'fulfilled' && r.value?.items?.length) {
            items.push(...r.value.items);
          }
        }
        requestLog.info('items after fallback aggregation', { itemCount: items.length });
      }
    } catch (fbErr) {
      requestLog.debug('fallback fetch failed', { message: String(fbErr) });
    }
  }

  return { items, urls, perFeedCounts, perFeedErrors, usedFallbacks, topHosts };
}

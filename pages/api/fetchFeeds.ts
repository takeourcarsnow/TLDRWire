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
};

export async function fetchFeeds(opts: {
  region: string;
  category: string;
  query: string;
  hours: number;
  language: string;
  loggerContext?: any;
  maxFeeds?: number;
}): Promise<FetchFeedsResult> {
  const { region, category, query, hours, language, loggerContext, maxFeeds = 16 } = opts;
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
    const otherUrls: string[] = [];
    for (const u of urlsToFetch) {
  try { const h = new URL(u).hostname; if (h && h.includes('news.google.com')) { googleUrls.push(u); continue; } } catch { /* ignore malformed URL */ }
      if (typeof u === 'string' && u.includes('news.google.com')) { googleUrls.push(u); continue; }
      otherUrls.push(u);
    }
    if (googleUrls.length) {
      requestLog.info('deprioritizing google news feeds', { googleCount: googleUrls.length, total: urlsToFetch.length });
      urlsToFetch = [...otherUrls, ...googleUrls];
    }
    // Log final fetch order for visibility
    requestLog.info('final fetch order', { count: urlsToFetch.length, order: urlsToFetch.slice(0, 40) });
  } catch (e) { /* ignore grouping errors */ }

  const concurrency = 2;
  const results: Array<any> = new Array(urlsToFetch.length);
  let workerIndex = 0;
  let stopFetching = false;

  // delegate actual fetching to fetcher module which uses shared caches

  const worker = async () => {
    // loop until all feeds fetched or aborted
    for (;;) {
      if (stopFetching) break;
      const i = workerIndex++;
      if (i >= urlsToFetch.length) break;
      if (stopFetching) break;
      const u = urlsToFetch[i];
      try { results[i] = await fetchWithRetries(u, requestLog); } catch (e:any) { results[i] = { status: 'rejected', reason: e }; }
    }
  };

  const workersPromise = Promise.all(new Array(Math.min(concurrency, urlsToFetch.length)).fill(0).map(() => worker()));
  const REQUEST_TIMEOUT_MS = 45000;
  const feedTimeoutMs = Math.max(REQUEST_TIMEOUT_MS - 8000, 8000);
  let feedTimedOut = false;
  await Promise.race([
    workersPromise,
  new Promise<void>((resolve) => setTimeout(() => { feedTimedOut = true; stopFetching = true; try { logger.warn('Feed fetching taking too long, aborting'); } catch { /* ignore */ }  resolve(); }, feedTimeoutMs))
  ]);
  if (feedTimedOut) {
    requestLog.warn('feed fetching soft-timeout reached; continuing with partial results', { attempted: urlsToFetch.length, fetched: results.filter(r=>r && r.status === 'fulfilled').length });
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

  // Detailed per-feed diagnostics for terminal visibility: which URL -> how many items / error
  try {
    const perFeedSummary = urlsToFetch.map((u, i) => {
      let hostname = '';
      try { hostname = new URL(u).hostname; } catch { hostname = u; }
      return { url: u, hostname, count: perFeedCounts[i], error: perFeedErrors[i] };
    });
    requestLog.info('per-feed summary', { perFeedSummary: perFeedSummary.slice(0, 50) });

    // Count item sources by hostname or source string to see which publishers produced articles
    const hostCounts: Record<string, number> = {};
    for (const it of items) {
      let host = '';
      try { host = new URL(it.link).hostname || String(it.source || ''); } catch { host = String(it.source || ''); }
      host = (host || '').toLowerCase();
      if (!host) host = 'unknown';
      hostCounts[host] = (hostCounts[host] || 0) + 1;
    }
    const topHosts = Object.entries(hostCounts).sort((a,b) => b[1] - a[1]).slice(0, 12).map(([host,count]) => ({ host, count }));
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
      const regionFallbacks = (region && region.toLowerCase() === 'lithuania') ? (FALLBACK_FEEDS['lithuania'] || []) : [];
      const fallbackUrls = Array.from(new Set([...categoryFallbacks, ...regionFallbacks]));

      if (fallbackUrls.length) {
        usedFallbacks = true;
        requestLog.debug('publisher fallback urls', { count: fallbackUrls.length, urls: fallbackUrls.slice(0, 8) });

        const fbResults: any[] = new Array(fallbackUrls.length);
        let fbIndex = 0;
        const fbWorker = async () => {
          for (;;) {
            const i = fbIndex++;
            if (i >= fallbackUrls.length) break;
            const u = fallbackUrls[i];
            try { fbResults[i] = await fetchWithRetries(u, requestLog); } catch (e:any) { fbResults[i] = { status: 'rejected', reason: e }; }
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
          requestLog.warn('fallback feed fetching soft-timeout reached; continuing with partial fallback results', { attempted: fallbackUrls.length, fetched: fbResults.filter(r=>r && r.status === 'fulfilled').length });
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

  return { items, urls, perFeedCounts, perFeedErrors, usedFallbacks };
}

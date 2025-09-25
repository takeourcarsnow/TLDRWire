import Parser from 'rss-parser';
import logger from './logger';
import { getAllFeedsWithFallbacks, resolveCategory } from './feeds';
import { FALLBACK_FEEDS } from './constants';
  // Region config kept previously for potential link normalization; currently unused.

// Per-feed caches and failure tracking (module-scoped to persist across invocations)
const parser = new Parser({
  timeout: 12000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36'
    }
  }
});

const FEED_CACHE = new Map<string, { ts: number; value?: any; failed?: boolean; reason?: string }>();
const FEED_CACHE_TTL_MS = 1000 * 60 * 60; // 60 minutes
const FEED_FAIL_TTL_MS = 1000 * 60 * 5; // 5 minutes negative cache for failing feeds
const FEED_FAIL_COUNTS = new Map<string, { count: number; ts: number }>();
const FEED_FAIL_BLACKLIST_THRESHOLD = 3;

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
  // regionCfgForLinks previously used for link normalization; safe to remove until needed

  // Limit feeds and deprioritize google news
  let urlsToFetch = urls;
  const MAX_FEEDS = maxFeeds;
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
  } catch (e) { /* ignore grouping errors */ }

  const concurrency = 2;
  const results: Array<any> = new Array(urlsToFetch.length);
  let workerIndex = 0;
  let stopFetching = false;

  const fetchWithRetries = async (u: string) => {
    try {
      const cached = FEED_CACHE.get(u);
      if (cached) {
        const age = Date.now() - cached.ts;
        if (cached.failed) {
          if (age < FEED_FAIL_TTL_MS) {
            requestLog.debug('feed negative-cache hit, skipping', { url: u, age });
            return { status: 'rejected', reason: new Error('recent fetch failed') };
          }
        } else {
          if (age < FEED_CACHE_TTL_MS) {
            requestLog.debug('feed cache hit', { url: u });
            return { status: 'fulfilled', value: cached.value };
          }
        }
      }
  } catch (err) { /* ignore cache read errors */ }

    let lastErr: any = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const isGoogle = (() => { try { return new URL(u).hostname === 'news.google.com'; } catch { return u.includes('news.google.com'); } })();
      const attemptStart = Date.now();
      try {
        if (isGoogle) requestLog.debug('google feed fetch attempt', { url: u, attempt });

        const fetchWithTimeout = async (url: string, ms: number) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), ms);
          try {
            const resp = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*;q=0.1'
              }
            } as any);
            clearTimeout(id);
            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              const err = new Error(`Status code ${resp.status}` + (text ? ` - ${text.slice(0,200)}` : ''));
              (err as any).status = resp.status;
              throw err;
            }
            return await resp.text();
          } catch (e) {
            clearTimeout(id);
            throw e;
          }
        };

        const raw = await fetchWithTimeout(u, Math.max(8000, Math.floor(12000)));
        const rawLower = (raw || '').toLowerCase().slice(0, 2000);
        if (rawLower.includes('<html') || rawLower.includes('<!doctype') || rawLower.includes('window.location') || rawLower.includes('redirect')) {
          const msg = `Non-RSS HTML response from ${u}`;
          const err = new Error(msg);
          (err as any).raw = raw;
          throw err;
        }
        const v = await parser.parseString(raw);
        const ms = Date.now() - attemptStart;
  try { FEED_CACHE.set(u, { ts: Date.now(), value: v }); } catch (e) { /* ignore cache set */ }
        if (isGoogle) requestLog.debug('google feed fetch success', { url: u, ms, items: (v?.items?.length || 0) });
  try { FEED_FAIL_COUNTS.delete(u); } catch { /* ignore */ }
  try { FEED_CACHE.set(u, { ts: Date.now(), value: v }); } catch (e) { /* ignore */ }
        return { status: 'fulfilled', value: v };
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || e);
        requestLog.debug('feed fetch attempt failed', { url: u, attempt, message: msg });
        if (isGoogle) requestLog.debug('google feed fetch attempt failed', { url: u, attempt, message: msg });
        if (attempt < maxAttempts) {
          const base = Math.min(1500, 300 * Math.pow(2, attempt - 1));
          const jitter = Math.floor(Math.random() * 300);
          await new Promise((r) => setTimeout(r, base + jitter));
        }
      }
    }

    try {
      const prev = FEED_FAIL_COUNTS.get(u) || { count: 0, ts: Date.now() };
      const now = Date.now();
      const windowMs = 1000 * 60 * 10;
      if (now - prev.ts > windowMs) { prev.count = 1; prev.ts = now; } else { prev.count = prev.count + 1; prev.ts = now; }
      FEED_FAIL_COUNTS.set(u, prev);
      const failedEntry: any = { ts: Date.now(), failed: true, reason: String(lastErr?.message || lastErr) };
      if (prev.count >= FEED_FAIL_BLACKLIST_THRESHOLD) {
        failedEntry.ts = Date.now();
        requestLog.info('blacklisting failing feed temporarily', { url: u, failCount: prev.count });
      }
      try { FEED_CACHE.set(u, failedEntry); } catch { /* ignore */ }
    } catch (e) { /* ignore fail bookkeeping errors */ }
    return { status: 'rejected', reason: lastErr };
  };

  const worker = async () => {
    // loop until all feeds fetched or aborted
    for (;;) {
      if (stopFetching) break;
      const i = workerIndex++;
      if (i >= urlsToFetch.length) break;
      if (stopFetching) break;
      const u = urlsToFetch[i];
      try { results[i] = await fetchWithRetries(u); } catch (e:any) { results[i] = { status: 'rejected', reason: e }; }
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
            try { fbResults[i] = await fetchWithRetries(u); } catch (e:any) { fbResults[i] = { status: 'rejected', reason: e }; }
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

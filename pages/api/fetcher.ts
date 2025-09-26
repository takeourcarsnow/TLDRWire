import { parser, FEED_CACHE, FEED_CACHE_TTL_MS, FEED_FAIL_TTL_MS, FEED_FAIL_COUNTS, FEED_FAIL_BLACKLIST_THRESHOLD } from './feedCache';
import logger from './logger';

export async function fetchWithRetries(u: string, requestLog: any, opts?: { signal?: AbortSignal }) {
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
  // reduce retries for flaky google news endpoints
  const isGoogleQuick = (() => { try { return new URL(u).hostname === 'news.google.com'; } catch { return u.includes('news.google.com'); } })();
  const maxAttempts = isGoogleQuick ? 2 : 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isGoogle = isGoogleQuick;
    const attemptStart = Date.now();
    try {
      // Log fetch start for visibility (hostname, attempt)
      let hostname = '';
      try { hostname = new URL(u).hostname; } catch { hostname = u; }
      requestLog.info('fetching feed', { url: u, hostname, attempt });
      if (isGoogle) requestLog.debug('google feed fetch attempt', { url: u, attempt });

      // Allow callers to pass a hint via headers or URL param in future; for now use shorter timeout for google feeds
      const perRequestTimeout = isGoogle ? 10000 : 12000;
      const fetchWithTimeout = async (url: string, ms: number, externalSignal?: AbortSignal) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ms);
        // If caller provided an external signal, listen to it and abort our controller
        const onAbort = () => controller.abort();
        if (externalSignal) {
          if (externalSignal.aborted) controller.abort();
          else externalSignal.addEventListener('abort', onAbort);
        }
        try {
          const resp = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*;q=0.1',
              'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          } as any);
          clearTimeout(timeoutId);
          if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
          if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            const err = new Error(`Status code ${resp.status}` + (text ? ` - ${text.slice(0,200)}` : ''));
            (err as any).status = resp.status;
            throw err;
          }
          return await resp.text();
        } catch (e) {
          clearTimeout(timeoutId);
          if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
          throw e;
        }
      };

  const raw = await fetchWithTimeout(u, Math.max(5000, Math.floor(perRequestTimeout)), opts?.signal);
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
      requestLog.info('feed fetch success', { url: u, hostname, ms, items: (v?.items?.length || 0) });
      if (isGoogle) requestLog.debug('google feed fetch success', { url: u, ms, items: (v?.items?.length || 0) });
      try { FEED_FAIL_COUNTS.delete(u); } catch { /* ignore */ }
      try { FEED_CACHE.set(u, { ts: Date.now(), value: v }); } catch (e) { /* ignore */ }
      return { status: 'fulfilled', value: v };
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      // Log failure with level warn so it's visible in terminal; keep debug for google-specific
      requestLog.warn('feed fetch attempt failed', { url: u, hostname: (new URL(u).hostname || u).toString?.(), attempt, message: msg });
      requestLog.debug('feed fetch attempt failed-debug', { url: u, attempt, message: msg, error: e?.stack || String(e) });
      if (isGoogle) requestLog.debug('google feed fetch attempt failed', { url: u, attempt, message: msg });
      if (e.name === 'AbortError' || msg.toLowerCase().includes('abort')) {
        // Don't retry on abort
        break;
      } else if (attempt < maxAttempts) {
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
}

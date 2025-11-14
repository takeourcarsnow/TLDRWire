import { resolveCategory } from './feeds';
import { FALLBACK_FEEDS } from './feedConstants';
import { fetchWithRetries } from './fetcher';
import { FetchResult } from './feedFetching';

export async function fetchFallbackFeeds(
  region: string,
  category: string,
  requestLog: any
): Promise<{ items: any[]; usedFallbacks: boolean }> {
  let items: any[] = [];
  let usedFallbacks = false;

  try {
    requestLog.info('no items from initial feeds, attempting publisher fallback feeds');

    const categoryKey = resolveCategory(category);
    const categoryFallbacks = FALLBACK_FEEDS[categoryKey] || FALLBACK_FEEDS['top'] || [];
    const regionFallbacks = FALLBACK_FEEDS[region?.toLowerCase()] || [];
    const fallbackUrls = Array.from(new Set([...categoryFallbacks, ...regionFallbacks]));

    if (fallbackUrls.length) {
      usedFallbacks = true;
      requestLog.debug('publisher fallback urls', {
        count: fallbackUrls.length,
        urls: fallbackUrls.slice(0, 8)
      });

      const fbResults: FetchResult[] = new Array(fallbackUrls.length);
      let fbIndex = 0;
      const fbControllers: Array<AbortController | null> = new Array(fallbackUrls.length).fill(null);
      const concurrency = Math.min(2, fallbackUrls.length);

      const fbWorker = async () => {
        for (;;) {
          const i = fbIndex++;
          if (i >= fallbackUrls.length) break;
          const u = fallbackUrls[i];
          try {
            const ctrl = new AbortController();
            fbControllers[i] = ctrl;
            const result = await fetchWithRetries(u, requestLog, { signal: ctrl.signal });
            fbResults[i] = { status: 'fulfilled', value: result };
          } catch (e: any) {
            fbResults[i] = { status: 'rejected', reason: e };
          }
        }
      };

      const fbWorkersPromise = Promise.all(
        new Array(Math.min(concurrency, fallbackUrls.length)).fill(0).map(() => fbWorker())
      );

      const REQUEST_TIMEOUT_MS = 20000;
      const fbTimeoutMs = Math.max(REQUEST_TIMEOUT_MS - 8000, 8000);
      let fbTimedOut = false;

      await Promise.race([
        fbWorkersPromise,
        new Promise<void>((resolve) => {
          setTimeout(() => {
            fbTimedOut = true;
            try { console.warn('Fallback feed fetching taking too long, aborting'); } catch { /* ignore */ }
            resolve();
          }, fbTimeoutMs);
        })
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
        requestLog.warn('fallback feed fetching soft-timeout reached; continuing with partial fallback results', {
          attempted: fallbackUrls.length,
          fetched: fbResults.filter(r => r && r.status === 'fulfilled').length,
          abortedFallbackControllers
        });
      }

      const fbCounts = fbResults.map((r: FetchResult) =>
        (r && r.status === 'fulfilled' ? (r.value?.items?.length || 0) : -1)
      );
      const fbErrors = fbResults.map((r: FetchResult) =>
        (r && r.status === 'rejected' ? String(r.reason || r.reason?.message || 'unknown') : null)
      );

      requestLog.info('publisher fallback fetch results', {
        fbCounts,
        sampleErrors: fbErrors.filter(Boolean).slice(0, 5)
      });

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

  return { items, usedFallbacks };
}
export default (_req: any, res: any) => res.status(404).end();

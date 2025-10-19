import { fetchWithRetries } from './fetcher';

export type FetchResult = {
  status: 'fulfilled' | 'rejected';
  value?: any;
  reason?: any;
};

export async function fetchFeedsConcurrently(
  urls: string[],
  requestLog: any,
  desiredItems: number = 0
): Promise<{
  results: FetchResult[];
  abortedControllers: number;
  feedTimedOut: boolean;
}> {
  const concurrency = Math.min(2, urls.length);
  const results: FetchResult[] = new Array(urls.length);
  let workerIndex = 0;
  let stopFetching = false;
  let aggregatedItemsCount = 0;
  const controllers: Array<AbortController | null> = new Array(urls.length).fill(null);
  let abortedControllers = 0;
  let completedFeeds = 0;

  const worker = async () => {
    for (;;) {
      if (stopFetching) break;
      const i = workerIndex++;
      if (i >= urls.length) break;
      if (stopFetching) break;

      const u = urls[i];
      try {
        const ctrl = new AbortController();
        controllers[i] = ctrl;
        const result = await fetchWithRetries(u, requestLog, { signal: ctrl.signal });
        results[i] = { status: 'fulfilled', value: result };
      } catch (e: any) {
        results[i] = { status: 'rejected', reason: e };
      }

      completedFeeds++;

      // Early stopping logic
      if (desiredItems > 0 && completedFeeds >= 3) {
        const r = results[i];
        if (r && r.status === 'fulfilled' && Array.isArray(r.value?.items)) {
          const totalItems = results.reduce((sum, res) => {
            if (res && res.status === 'fulfilled' && Array.isArray(res.value?.items)) {
              return sum + (res.value.items.length || 0);
            }
            return sum;
          }, 0);

          if (totalItems >= desiredItems) {
            stopFetching = true;
            requestLog.info('early stop: enough items gathered, aborting remaining fetches', {
              desiredItems,
              aggregatedItemsCount: totalItems,
              url: u,
              index: i
            });

            // Abort remaining controllers
            for (const c of controllers) {
              if (c && !c.signal.aborted) {
                try { c.abort(); abortedControllers++; } catch (e) { /* ignore */ }
              }
            }
            break;
          }
        }
      }
    }
  };

  const workersPromise = Promise.all(
    new Array(Math.min(concurrency, urls.length)).fill(0).map(() => worker())
  );

  // Overall request timeout for the feed fetching stage
  const REQUEST_TIMEOUT_MS = 20000; // 20s overall for feed stage
  const feedTimeoutMs = Math.max(REQUEST_TIMEOUT_MS - 5000, 5000);
  let feedTimedOut = false;

  await Promise.race([
    workersPromise,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        feedTimedOut = true;
        stopFetching = true;
        try { console.warn('Feed fetching taking too long, aborting'); } catch { /* ignore */ }
        resolve();
      }, feedTimeoutMs);
    })
  ]);

  if (feedTimedOut) {
    // Abort in-flight requests
    for (const c of controllers) {
      if (c && !c.signal.aborted) {
        try { c.abort(); abortedControllers++; } catch (e) { /* ignore */ }
      }
    }
    requestLog.warn('feed fetching soft-timeout reached; continuing with partial results', {
      attempted: urls.length,
      fetched: results.filter(r => r && r.status === 'fulfilled').length,
      abortedControllers
    });
  }

  return { results, abortedControllers, feedTimedOut };
}
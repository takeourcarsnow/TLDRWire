import { FetchResult } from './feedFetching';

export function aggregateFeedResults(results: FetchResult[]): {
  items: any[];
  perFeedCounts: number[];
  perFeedErrors: Array<string | null>;
} {
  const perFeedCounts = results.map((r: FetchResult) =>
    (r && r.status === 'fulfilled' ? (r.value?.items?.length || 0) : -1)
  );

  const perFeedErrors = results.map((r: FetchResult) =>
    (r && r.status === 'rejected' ? String(r.reason || r.reason?.message || 'unknown') : null)
  );

  let items: any[] = [];
  for (const r of results) {
    if (r && r.status === "fulfilled" && r.value?.items?.length) {
      items.push(...r.value.items);
    }
  }

  return { items, perFeedCounts, perFeedErrors };
}

export function computeFeedDiagnostics(
  urls: string[],
  perFeedCounts: number[],
  perFeedErrors: Array<string | null>,
  abortedControllers: number,
  requestLog: any
): void {
  try {
    const perFeedSummary = urls.map((u, i) => {
      let hostname = '';
      try { hostname = new URL(u).hostname; } catch { hostname = u; }
      return { url: u, hostname, count: perFeedCounts[i], error: perFeedErrors[i] };
    });
    requestLog.info('per-feed summary', {
      perFeedSummary: perFeedSummary.slice(0, 50),
      abortedControllers
    });
  } catch (e) {
    requestLog.debug('failed to compute per-feed diagnostics', { message: String(e) });
  }
}

export function computeTopHosts(items: any[], requestLog: any): Array<{ host: string; count: number }> {
  try {
    const hostCounts: Record<string, number> = {};
    for (const it of items) {
      let host = '';
      try { host = new URL(it.link).hostname || String(it.source || ''); } catch { host = String(it.source || ''); }
      host = (host || '').toLowerCase();
      if (!host) host = 'unknown';
      hostCounts[host] = (hostCounts[host] || 0) + 1;
    }
    const topHosts = Object.entries(hostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([host, count]) => ({ host, count }));

    requestLog.info('top item sources', { topHosts });
    return topHosts;
  } catch (e) {
    requestLog.debug('failed to compute top hosts', { message: String(e) });
    return [];
  }
}
import logger from './logger';

export type ProcessArticlesResult = {
  topItems: any[];
  cleanTopItems: any[];
  maxAge: number;
};

export async function processArticles(opts: {
  feedsResult: any;
  maxArticles?: number;
  preferLatest?: boolean;
  region?: string;
  category?: string;
  query?: string;
  loggerContext?: any;
  maxAgeHours?: number;
}): Promise<ProcessArticlesResult> {
  const { feedsResult, maxArticles = 20, preferLatest = false, region, category, query, loggerContext, maxAgeHours } = opts;
  const log = logger.child({ route: '/api/tldr/processArticles', region, category, maxArticles, query, ...(loggerContext || {}) });

  const rawItems: any[] = (feedsResult?.items || []).map((it: any) => {
    const title = it.title || it['dc:title'] || it.description || '';
    const link = it.link || it.guid || (it.enclosure && it.enclosure.url) || '';
    const pubDate = it.pubDate ? new Date(it.pubDate).getTime() : (it.isoDate ? new Date(it.isoDate).getTime() : Date.now());
    const source = it.creator || it.author || (it['dc:creator']) || (it.feedTitle) || '';
    return { title: String(title || '').trim(), link: String(link || '').trim(), pubDate: Number(pubDate || Date.now()), source, raw: it };
  });

  // Basic dedupe by normalized title + link
  const seen = new Set<string>();
  const normalized = [] as any[];
  for (const it of rawItems) {
    const key = (it.title || '') + '::' + (it.link || '');
    const k = key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(k)) continue;
    seen.add(k);
    normalized.push(it);
  }

  // Sort by pub date desc or ascend depending on preferLatest
  normalized.sort((a,b) => (preferLatest ? a.pubDate - b.pubDate : b.pubDate - a.pubDate));

  const DEFAULT_CAP_MS = 1000 * 60 * 60 * 24 * 7; // default cap 7 days
  let maxAge = DEFAULT_CAP_MS;
  try {
    if (typeof maxAgeHours === 'number' && !isNaN(maxAgeHours)) {
      // Ensure at least 1 hour and round to integer hours
      const hrs = Math.max(1, Math.round(Number(maxAgeHours)));
      const requestedMs = hrs * 1000 * 60 * 60;
      // Don't allow requested window to exceed the default cap
      maxAge = Math.min(DEFAULT_CAP_MS, requestedMs);
    }
  } catch (e) {
    maxAge = DEFAULT_CAP_MS;
  }
  const now = Date.now();
  const withinWindow = normalized.filter(it => (now - (it.pubDate || now)) <= maxAge);
  // If region is Lithuania, enforce a source-mix rule: don't let delfi.lt dominate.
  // At most floor(maxArticles / 3) items may be from delfi.lt. Prefer other LT outlets
  // such as lrt.lt, lrytas.lt, 15min.lt when available.
  let topItems = withinWindow.slice(0, maxArticles);
  try {
    if ((region || '').toString().toLowerCase() === 'lithuania' && withinWindow.length > 0) {
      const maxDelfi = Math.floor(maxArticles / 3);
      const preferredLtHosts = ['lrt.lt', 'lrytas.lt', '15min.lt'];

  const preferredLt: any[] = [];
  const delfi: any[] = [];
  const others: any[] = [];

      for (const it of withinWindow) {
        let host = '';
        try { host = new URL(it.link).hostname || ''; } catch { host = String(it.source || '').toLowerCase(); }
        host = (host || '').toLowerCase();

        // More permissive Delfi detection: check host, link and source for 'delfi' or 'delfi.lt'
        const linkLower = String(it.link || '').toLowerCase();
        const sourceLower = String(it.source || '').toLowerCase();
        const isDelfi = host.includes('delfi') || linkLower.includes('delfi.lt') || sourceLower.includes('delfi');
        const isPreferredLt = preferredLtHosts.some(h => host.includes(h) || String(it.source || '').toLowerCase().includes(h));

        if (isDelfi) delfi.push(it);
        else if (isPreferredLt) preferredLt.push(it);
        else others.push(it);
      }

      const selected: any[] = [];

      // Diagnostic logging: counts so you can see what's available before selection
      try {
        const sampleHosts = withinWindow.slice(0, 30).map(it => {
          try { return { link: it.link, host: new URL(it.link).hostname }; } catch { return { link: it.link, host: String(it.source || '') }; }
        });
        log.info('lithuania source pools before selection', { total: withinWindow.length, preferredLt: preferredLt.length, delfi: delfi.length, others: others.length, sampleHosts: sampleHosts.slice(0, 12) });
      } catch (e) {
        log.debug('failed to log lithuania pools', { message: String(e) });
      }

      // Reserve a small number of slots for Delfi so we always include a couple when available.
      // Reserve up to 2 but never exceed the overall delfi cap.
      const reserveForDelfi = Math.min(2, maxDelfi, delfi.length);
      const nonDelfiLimit = Math.max(0, maxArticles - reserveForDelfi);

      // 1) take preferred Lithuanian non-delfi up to the non-delfi limit
      for (const it of preferredLt) {
        if (selected.length >= nonDelfiLimit) break;
        selected.push(it);
      }

      // 2) take other non-delfi sources (global or local) up to the non-delfi limit
      for (const it of others) {
        if (selected.length >= nonDelfiLimit) break;
        selected.push(it);
      }

      // 3) add Delfi items respecting the overall cap (maxDelfi)
      let addedDelfi = 0;
      for (const it of delfi) {
        if (selected.length >= maxArticles) break;
        if (addedDelfi >= maxDelfi) break;
        selected.push(it);
        addedDelfi++;
      }

      // 4) if we still have slots, fill from remaining pools while respecting the delfi cap
      if (selected.length < maxArticles) {
        const remaining = [...preferredLt, ...others, ...delfi].filter(it => !selected.includes(it));
        for (const it of remaining) {
          if (selected.length >= maxArticles) break;
          const host = (() => { try { return new URL(it.link).hostname || ''; } catch { return String(it.source || '').toLowerCase(); } })().toLowerCase();
          const isD = host.includes('delfi.') || String(it.source || '').toLowerCase().includes('delfi');
          const currentDelfiCount = selected.filter(s => { try { return (new URL(s.link).hostname || '').toLowerCase().includes('delfi.'); } catch { return String(s.source || '').toLowerCase().includes('delfi'); } }).length;
          if (isD && currentDelfiCount >= maxDelfi) continue;
          selected.push(it);
        }
      }

      topItems = selected.slice(0, maxArticles);
    }
    else {
      // General host-diversity enforcement for other regions:
      // Build buckets of items per host (preserve withinWindow order which is date-sorted)
      const hostBuckets: Record<string, any[]> = {};
      for (const it of withinWindow) {
        let host = '';
        try { host = new URL(it.link).hostname || ''; } catch { host = String(it.source || '').toLowerCase(); }
        host = (host || 'unknown').toLowerCase();
        if (!hostBuckets[host]) hostBuckets[host] = [];
        hostBuckets[host].push(it);
      }

      const hosts = Object.keys(hostBuckets);
      // If there's only one host available, fallback to the naive slice
      if (hosts.length <= 1) {
        topItems = withinWindow.slice(0, maxArticles);
      } else {
        // Cap per-host items to enforce diversity: at least 1, at most 3 or 40% of requested
        const maxPerHost = Math.max(1, Math.min(3, Math.floor(maxArticles * 0.4)));

        try {
          const hostCounts: Record<string, number> = {};
          hosts.forEach(h => hostCounts[h] = hostBuckets[h].length);
          log.info('host pools before diversity selection', { total: withinWindow.length, hosts: hosts.length, hostCounts });
        } catch (e) { /* ignore logging errors */ }

        const selected: any[] = [];

        // Round-robin selection: pick newest available from each host while respecting per-host cap
        let progress = true;
        while (selected.length < maxArticles && progress) {
          progress = false;
          for (const h of hosts) {
            if (selected.length >= maxArticles) break;
            const bucket = hostBuckets[h];
            if (!bucket || bucket.length === 0) continue;
            const countForHost = selected.filter(s => {
              try { return (new URL(s.link).hostname || '').toLowerCase() === h; } catch { return String(s.source || '').toLowerCase() === h; }
            }).length;
            if (countForHost >= maxPerHost) continue;
            // take the next item from this host
            selected.push(bucket.shift() as any);
            progress = true;
          }
        }

        // If we still have slots, fill from remaining items regardless of host cap
        if (selected.length < maxArticles) {
          const remaining = hosts.flatMap(h => hostBuckets[h] || []);
          for (const it of remaining) {
            if (selected.length >= maxArticles) break;
            selected.push(it);
          }
        }

        topItems = selected.slice(0, maxArticles);
      }
    }
  } catch (e) {
    // on any error fall back to default selection
    log && log.debug && log.debug('lithuania source-mix enforcement failed', { message: String(e) });
    topItems = withinWindow.slice(0, maxArticles);
  }
  const cleanTopItems = topItems.map((it:any) => ({ title: it.title, url: it.link, publishedAt: it.pubDate, source: it.source }));

  log.info('processed articles', { rawCount: rawItems.length, deduped: normalized.length, selected: topItems.length });
  return { topItems, cleanTopItems, maxAge };
}

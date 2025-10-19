import { NormalizedArticle } from './articleNormalization';

export const enforceSourceDiversity = (
  articles: NormalizedArticle[],
  maxArticles: number,
  region?: string
): NormalizedArticle[] => {
  if ((region || '').toString().toLowerCase() === 'lithuania' && articles.length > 0) {
    return enforceLithuaniaDiversity(articles, maxArticles);
  } else {
    return enforceGeneralDiversity(articles, maxArticles);
  }
};

const enforceLithuaniaDiversity = (articles: NormalizedArticle[], maxArticles: number): NormalizedArticle[] => {
  const maxDelfi = Math.floor(maxArticles / 3);
  const preferredLtHosts = ['lrt.lt', 'lrytas.lt', '15min.lt'];

  const preferredLt: NormalizedArticle[] = [];
  const delfi: NormalizedArticle[] = [];
  const others: NormalizedArticle[] = [];

  for (const article of articles) {
    let host = '';
    try { host = new URL(article.link).hostname || ''; } catch { host = String(article.source || '').toLowerCase(); }
    host = (host || '').toLowerCase();

    // More permissive Delfi detection: check host, link and source for 'delfi' or 'delfi.lt'
    const linkLower = String(article.link || '').toLowerCase();
    const sourceLower = String(article.source || '').toLowerCase();
    const isDelfi = host.includes('delfi') || linkLower.includes('delfi.lt') || sourceLower.includes('delfi');
    const isPreferredLt = preferredLtHosts.some(h => host.includes(h) || String(article.source || '').toLowerCase().includes(h));

    if (isDelfi) delfi.push(article);
    else if (isPreferredLt) preferredLt.push(article);
    else others.push(article);
  }

  const selected: NormalizedArticle[] = [];

  // Reserve a small number of slots for Delfi so we always include a couple when available.
  // Reserve up to 2 but never exceed the overall delfi cap.
  const reserveForDelfi = Math.min(2, maxDelfi, delfi.length);
  const nonDelfiLimit = Math.max(0, maxArticles - reserveForDelfi);

  // 1) take preferred Lithuanian non-delfi up to the non-delfi limit
  for (const article of preferredLt) {
    if (selected.length >= nonDelfiLimit) break;
    selected.push(article);
  }

  // 2) take other non-delfi sources (global or local) up to the non-delfi limit
  for (const article of others) {
    if (selected.length >= nonDelfiLimit) break;
    selected.push(article);
  }

  // 3) add Delfi items respecting the overall cap (maxDelfi)
  let addedDelfi = 0;
  for (const article of delfi) {
    if (selected.length >= maxArticles) break;
    if (addedDelfi >= maxDelfi) break;
    selected.push(article);
    addedDelfi++;
  }

  // 4) if we still have slots, fill from remaining pools while respecting the delfi cap
  if (selected.length < maxArticles) {
    const remaining = [...preferredLt, ...others, ...delfi].filter(article => !selected.includes(article));
    for (const article of remaining) {
      if (selected.length >= maxArticles) break;
      const host = (() => { try { return new URL(article.link).hostname || ''; } catch { return String(article.source || '').toLowerCase(); } })().toLowerCase();
      const isD = host.includes('delfi.') || String(article.source || '').toLowerCase().includes('delfi');
      const currentDelfiCount = selected.filter(s => { try { return (new URL(s.link).hostname || '').toLowerCase().includes('delfi.'); } catch { return String(s.source || '').toLowerCase().includes('delfi'); } }).length;
      if (isD && currentDelfiCount >= maxDelfi) continue;
      selected.push(article);
    }
  }

  return selected.slice(0, maxArticles);
};

const enforceGeneralDiversity = (articles: NormalizedArticle[], maxArticles: number): NormalizedArticle[] => {
  // Build buckets of items per host (preserve articles order which is date-sorted)
  const hostBuckets: Record<string, NormalizedArticle[]> = {};
  for (const article of articles) {
    let host = '';
    try { host = new URL(article.link).hostname || ''; } catch { host = String(article.source || '').toLowerCase(); }
    host = (host || 'unknown').toLowerCase();
    if (!hostBuckets[host]) hostBuckets[host] = [];
    hostBuckets[host].push(article);
  }

  const hosts = Object.keys(hostBuckets);
  // If there's only one host available, fallback to the naive slice
  if (hosts.length <= 1) {
    return articles.slice(0, maxArticles);
  } else {
    // Cap per-host items to enforce diversity: at least 1, at most 3 or 40% of requested
    const maxPerHost = Math.max(1, Math.min(3, Math.floor(maxArticles * 0.4)));

    const selected: NormalizedArticle[] = [];

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
        selected.push(bucket.shift() as NormalizedArticle);
        progress = true;
      }
    }

    // If we still have slots, fill from remaining items regardless of host cap
    if (selected.length < maxArticles) {
      const remaining = hosts.flatMap(h => hostBuckets[h] || []);
      for (const article of remaining) {
        if (selected.length >= maxArticles) break;
        selected.push(article);
      }
    }

    return selected.slice(0, maxArticles);
  }
};
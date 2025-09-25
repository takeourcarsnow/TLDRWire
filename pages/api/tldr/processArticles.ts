import { getRegionConfig } from '../feeds';
import { timeOK, truncate, domainFromLink, normalizeGoogleNewsLink, calculateCategoryRelevance, dedupeArticles } from '../utils';
import { SPORT_TYPES } from '../constants';
import type { Article } from '../utils';

export type ProcessResult = {
  topItems: Article[];
  cleanTopItems: Article[];
  maxAge: number;
};

export function processArticles(opts: {
  items: any[];
  region: string;
  category: string;
  timeframeHours: number;
  language: string;
  limit: number | string;
}): ProcessResult {
  const { items, region, category, timeframeHours, language, limit } = opts;
  const maxAge = Math.max(1, Math.min(72, Number(timeframeHours) || 24));
  const normalized: Article[] = [];
  const seen = new Set<string>();
  const regionCfgForLinks = getRegionConfig(region, language); // used for link normalization

  for (const it of items) {
    const title = (it.title || '').trim();
    let link = (it.link || '').trim();
    if (!title || !link) continue;
    link = normalizeGoogleNewsLink(link, regionCfgForLinks);
    const key = title + '|' + domainFromLink(link);
    if (seen.has(key)) continue;
    seen.add(key);
    const isoDate = it.isoDate || it.pubDate || null;
    if (!timeOK(isoDate, maxAge)) continue;
    const article: Article = {
      title,
      link,
      source: it.source?.title || domainFromLink(link),
      isoDate: isoDate ? new Date(isoDate).toISOString() : null,
      snippet: it.contentSnippet || it.summary || truncate((it.content || '').replace(/<[^>]*>/g, ''), 300)
    } as Article;
    article.categoryRelevance = calculateCategoryRelevance(article, category);
    normalized.push(article);
  }

  const regionCfgTmp = getRegionConfig(region, language);
  let regionTLD = regionCfgTmp.gl?.toLowerCase();
  if (regionTLD === 'gb') regionTLD = 'uk';

  for (const a of normalized) {
    const host = domainFromLink(a.link);
    if (region && region !== 'global' && host) {
      const h = host.toLowerCase();
      const titleSnippet = ((a.title || '') + ' ' + (a.snippet || '')).toLowerCase();
      const matchesRegionTLD = regionTLD && (h.endsWith('.' + regionTLD) || h === regionTLD);
      const containsRegionName = regionCfgTmp.name && titleSnippet.includes(regionCfgTmp.name.toLowerCase());
      if (matchesRegionTLD || containsRegionName) {
        a.categoryRelevance = Math.min(1, (a.categoryRelevance || 0.5) + 0.35);
        a._localMatch = true;
      } else {
        const penalty = (category === 'politics') ? 0.15 : 0.25;
        a.categoryRelevance = Math.max(0, (a.categoryRelevance || 0.5) - penalty);
        a._localMatch = false;
      }
    }
  }

  normalized.sort((a, b) => {
    const relevanceDiff = (b.categoryRelevance || 0) - (a.categoryRelevance || 0);
    if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
    const ta = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const tb = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return tb - ta;
  });

  let filteredArticles = normalized;
  if (category && category !== 'top' && category !== 'world') {
    const threshold = category === 'politics' ? 0.12 : 0.2;
    filteredArticles = normalized.filter(article => (article.categoryRelevance || 0) >= threshold);
    if (filteredArticles.length < 5 && normalized.length > filteredArticles.length) {
      const additionalCount = Math.min(5 - filteredArticles.length, normalized.length - filteredArticles.length);
      const lowRelevanceArticles = normalized.slice(filteredArticles.length, filteredArticles.length + additionalCount);
      filteredArticles = [...filteredArticles, ...lowRelevanceArticles];
    }
  }

  let uniqueArticles = dedupeArticles(filteredArticles, category === 'politics' ? 0.66 : undefined);
  if (uniqueArticles.length < 8 && filteredArticles.length > uniqueArticles.length) {
    const reDedupe = dedupeArticles(filteredArticles, 0.80);
    if (reDedupe.length > uniqueArticles.length) uniqueArticles = reDedupe;
  }

  for (const a of uniqueArticles) {
    const c = Math.max(1, a._cluster || 1);
    const boost = Math.min(0.15, (c - 1) * 0.03);
    a.categoryRelevance = Math.min(1, (a.categoryRelevance || 0.5) + boost);
  }
  uniqueArticles = uniqueArticles.map(a => { const { _toks, ...rest } = a; return rest; });

  const take = Math.max(8, Math.min(40, Number(limit) || 20));
  const perSourceCap = category === 'sports' ? 3 : 4;
  const bySourceCount = new Map<string, number>();
  const sourceCapped: Article[] = [];
  for (const a of uniqueArticles) {
    const src = (a.source || domainFromLink(a.link) || '').toLowerCase();
    const c = bySourceCount.get(src) || 0;
    if (c >= perSourceCap) continue;
    bySourceCount.set(src, c + 1);
    sourceCapped.push(a);
  }

  let diversified = sourceCapped.length < 8 ? uniqueArticles : sourceCapped;

  if (category === 'sports') {
    const detectType = (art: Article): string => {
      const txt = `${art.title || ''} ${art.snippet || ''}`.toLowerCase();
      for (const [type, keywords] of Object.entries(SPORT_TYPES)) {
        if (keywords.some((k) => txt.includes(k))) return type;
      }
      return 'other';
    };
    const buckets: Record<string, Article[]> = {};
    for (const a of sourceCapped) {
      const t = detectType(a);
      (buckets[t] ||= []).push(a);
    }
    const maxNFL = take >= 24 ? 2 : 1;
    const result: Article[] = [];
    const pushSome = (arr: Article[], n: number) => {
      for (const x of arr) { if (result.length >= take) break; if (n-- <= 0) break; result.push(x); }
    };
    const order = ['soccer','basketball','tennis','motorsport','cricket','golf','hockey','mma','boxing','athletics','cycling','rugby','winter','olympics','baseball','other'];
    pushSome(buckets.american_football || [], maxNFL);
    let round = 0;
    while (result.length < take && round < 10) {
      for (const key of order) {
        const arr = buckets[key] || [];
        if (arr.length) { result.push(arr.shift()!); if (result.length >= take) break; }
      }
      round++;
    }
    if (result.length < take) {
      const leftovers = Object.values(buckets).flat();
      for (const x of leftovers) { if (result.length >= take) break; result.push(x); }
    }
    diversified = result;
  }

  const topItems = diversified.slice(0, take);
  const cleanTopItems = topItems.map(({ categoryRelevance, _localMatch, _cluster, _toks, ...article }) => article as Article);
  return { topItems, cleanTopItems, maxAge };
}

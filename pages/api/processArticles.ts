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
}): Promise<ProcessArticlesResult> {
  const { feedsResult, maxArticles = 20, preferLatest = false, region, category, query, loggerContext } = opts;
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

  const maxAge = 1000 * 60 * 60 * 24 * 7; // default cap 7 days
  const now = Date.now();
  const withinWindow = normalized.filter(it => (now - (it.pubDate || now)) <= maxAge);

  const topItems = withinWindow.slice(0, maxArticles);
  const cleanTopItems = topItems.map((it:any) => ({ title: it.title, url: it.link, publishedAt: it.pubDate, source: it.source }));

  log.info('processed articles', { rawCount: rawItems.length, deduped: normalized.length, selected: topItems.length });
  return { topItems, cleanTopItems, maxAge };
}

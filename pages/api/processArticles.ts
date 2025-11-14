import logger from '../../app/utils/logger';
import { normalizeArticles } from './articleNormalization';
import { deduplicateArticles } from './deduplication';
import { sortAndFilterArticles } from './sortingAndFiltering';
import { enforceSourceDiversity } from './sourceDiversity';
import { performImageScraping, CleanArticle } from './imageScraping';
import { CATEGORY_FILTERS } from './categories';

export type ProcessArticlesResult = {
  topItems: any[];
  cleanTopItems: CleanArticle[];
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
  enableImageScraping?: boolean;
}): Promise<ProcessArticlesResult> {
  const { feedsResult, maxArticles = 20, preferLatest = false, region, category, query, loggerContext, maxAgeHours, enableImageScraping = false } = opts;
  const log = logger.child({ route: '/api/tldr/processArticles', region, category, maxArticles, query, ...(loggerContext || {}) });

  // Track if we've logged sample fields
  let loggedSampleFields = false;

  // Debug: log available fields in the first few items
  if (!loggedSampleFields && feedsResult?.items?.length > 0) {
    const firstItem = feedsResult.items[0];
    console.log('DEBUG: Sample RSS item fields:', Object.keys(firstItem));
    console.log('DEBUG: Sample RSS item content fields:', {
      title: firstItem.title,
      enclosure: firstItem.enclosure,
      'media:content': firstItem['media:content'],
      'media:thumbnail': firstItem['media:thumbnail'],
      content: firstItem.content?.substring(0, 200),
      'content:encoded': firstItem['content:encoded']?.substring(0, 200),
      contentSnippet: firstItem.contentSnippet?.substring(0, 200),
      image: firstItem.image
    });
    loggedSampleFields = true;
  }

  const rawItems = normalizeArticles(feedsResult);

  // Basic dedupe by normalized title + link
  const normalized = deduplicateArticles(rawItems);

  // Filter by category for regions with general feeds
  const categoryFiltered = filterArticlesByCategory(normalized, category || '', region || '');

  // Sort by pub date and filter by age
  const { filteredArticles: withinWindow, maxAge } = sortAndFilterArticles(categoryFiltered, preferLatest, maxAgeHours);

  // Enforce source diversity
  let topItems: any[];
  try {
    topItems = enforceSourceDiversity(withinWindow, maxArticles, region);

    // Diagnostic logging for Lithuania
    if ((region || '').toString().toLowerCase() === 'lithuania' && withinWindow.length > 0) {
      const sampleHosts = withinWindow.slice(0, 30).map(it => {
        try { return { link: it.link, host: new URL(it.link).hostname }; } catch { return { link: it.link, host: String(it.source || '') }; }
      });
      const preferredLtHosts = ['lrt.lt', 'lrytas.lt', '15min.lt'];
      const preferredLt = withinWindow.filter(it => {
        let host = '';
        try { host = new URL(it.link).hostname || ''; } catch { host = String(it.source || '').toLowerCase(); }
        return preferredLtHosts.some(h => host.includes(h) || String(it.source || '').toLowerCase().includes(h));
      });
      const delfi = withinWindow.filter(it => {
        let host = '';
        try { host = new URL(it.link).hostname || ''; } catch { host = String(it.source || '').toLowerCase(); }
        const linkLower = String(it.link || '').toLowerCase();
        const sourceLower = String(it.source || '').toLowerCase();
        return host.includes('delfi') || linkLower.includes('delfi.lt') || sourceLower.includes('delfi');
      });
      const others = withinWindow.filter(it => !preferredLt.includes(it) && !delfi.includes(it));
      log.info('lithuania source pools before selection', { total: withinWindow.length, preferredLt: preferredLt.length, delfi: delfi.length, others: others.length, sampleHosts: sampleHosts.slice(0, 12) });
    } else {
      // General host-diversity logging
      const hostBuckets: Record<string, any[]> = {};
      for (const it of withinWindow) {
        let host = '';
        try { host = new URL(it.link).hostname || ''; } catch { host = String(it.source || '').toLowerCase(); }
        host = (host || 'unknown').toLowerCase();
        if (!hostBuckets[host]) hostBuckets[host] = [];
        hostBuckets[host].push(it);
      }
      const hosts = Object.keys(hostBuckets);
      const hostCounts: Record<string, number> = {};
      hosts.forEach(h => hostCounts[h] = hostBuckets[h].length);
      log.info('host pools before diversity selection', { total: withinWindow.length, hosts: hosts.length, hostCounts });
    }
  } catch (e) {
    // on any error fall back to default selection
    log && log.debug && log.debug('source diversity enforcement failed', { message: String(e) });
    topItems = withinWindow.slice(0, maxArticles);
  }

  const cleanTopItems: CleanArticle[] = topItems.map((it: any) => ({
    title: it.title,
    url: it.link,
    publishedAt: it.pubDate,
    source: it.source,
    imageUrl: it.imageUrl
  }));

  // Optional: Scrape articles for images if RSS didn't provide them
  await performImageScraping(topItems, cleanTopItems, enableImageScraping, {
    maxConcurrent: 3, // Allow 3 concurrent requests
    delayBetweenRequests: 500, // 500ms delay between requests
    lazyLoad: false // Wait for scraping to complete before returning
  });

  log.info('processed articles', { rawCount: rawItems.length, deduped: normalized.length, selected: topItems.length });
  return { topItems, cleanTopItems, maxAge };
}

function filterArticlesByCategory(articles: any[], category: string, region: string): any[] {
  if (!category || category === 'top' || category === 'world') {
    return articles;
  }

  // Only apply filtering for regions that use general feeds, like Lithuania
  if (region !== 'lithuania') {
    return articles;
  }

  const filters = CATEGORY_FILTERS[category];
  if (!filters || filters.length === 0) {
    return articles;
  }

  // Lithuanian hosts that publish general news
  const lithuanianHosts = ['lrt.lt', 'delfi.lt', '15min.lt', 'lrytas.lt'];

  return articles.filter(article => {
    let host = '';
    try { host = new URL(article.link).hostname.toLowerCase(); } catch { host = ''; }
    const isLithuanian = lithuanianHosts.some(h => host.includes(h));

    // If not from Lithuanian source, keep it (assume international feeds are already category-specific)
    if (!isLithuanian) {
      return true;
    }

    // For Lithuanian sources, apply category filtering
    const title = (article.title || '').toLowerCase();
    const content = (article.contentSnippet || article.content || '').toLowerCase();
    const text = `${title} ${content}`;

    // Check if any filter keyword is present in title or content
    return filters.some(keyword => text.includes(keyword.toLowerCase()));
  });
}

export default (_req: any, res: any) => res.status(404).end();

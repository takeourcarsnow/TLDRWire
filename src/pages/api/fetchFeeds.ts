import logger from '../../utils/logger';
import { prepareFeedUrls, prioritizeAndFilterUrls } from './feedPreparation';
import { fetchFeedsConcurrently } from './feedFetching';
import { aggregateFeedResults, computeFeedDiagnostics, computeTopHosts } from './resultAggregation';
import { fetchFallbackFeeds } from './fallbackFetching';
import { FetchFeedsResult, FetchFeedsOptions } from './fetchFeedsTypes';

export async function fetchFeeds(opts: FetchFeedsOptions): Promise<FetchFeedsResult> {
  const { region, category, query, hours, language, loggerContext, maxFeeds = 16 } = opts;
  const desiredItems = opts.desiredItems || 0;
  const requestLog = logger.child({
    route: '/api/tldr/fetchFeeds',
    region,
    category,
    hours,
    language,
    query,
    ...(loggerContext || {})
  });

  // Prepare and prioritize feed URLs
  let urls = prepareFeedUrls({ region, category, query, hours, language, maxFeeds });
  requestLog.debug('feed urls built', { urls, sampleUrl: urls[0] });
  requestLog.info('feeds to consider', { count: urls.length, sample: urls.slice(0, 6) });

  // Prioritize and filter URLs (remove Google News, prioritize region fallbacks)
  urls = prioritizeAndFilterUrls(urls, region);
  requestLog.info('final fetch order', { count: urls.length, order: urls.slice(0, 40) });

  // Fetch feeds concurrently with early stopping
  const { results, abortedControllers } = await fetchFeedsConcurrently(urls, requestLog, desiredItems);

  // Aggregate results
  const { items, perFeedCounts, perFeedErrors } = aggregateFeedResults(results);
  requestLog.info('feed items aggregated', { itemCount: items.length });

  // Compute diagnostics
  computeFeedDiagnostics(urls, perFeedCounts, perFeedErrors, abortedControllers, requestLog);
  const topHosts = computeTopHosts(items, requestLog);

  let usedFallbacks = false;

  // If no items found, try fallback feeds
  if (items.length === 0) {
    const fallbackResult = await fetchFallbackFeeds(region, category, requestLog);
    if (fallbackResult.items.length > 0) {
      items.push(...fallbackResult.items);
    }
    usedFallbacks = fallbackResult.usedFallbacks;
  }

  return { items, urls, perFeedCounts, perFeedErrors, usedFallbacks, topHosts };
}

export default (_req: any, res: any) => res.status(404).end();

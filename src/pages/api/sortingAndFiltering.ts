import { NormalizedArticle } from './articleNormalization';

export const sortAndFilterArticles = (
  articles: NormalizedArticle[],
  preferLatest: boolean,
  maxAgeHours?: number
): { filteredArticles: NormalizedArticle[]; maxAge: number } => {
  // Sort by pub date desc or ascend depending on preferLatest
  articles.sort((a, b) => (preferLatest ? a.pubDate - b.pubDate : b.pubDate - a.pubDate));

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
  const filteredArticles = articles.filter(it => (now - (it.pubDate || now)) <= maxAge);

  return { filteredArticles, maxAge };
};
export default (_req: any, res: any) => res.status(404).end();

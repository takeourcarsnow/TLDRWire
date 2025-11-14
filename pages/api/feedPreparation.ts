import { getAllFeedsWithFallbacks } from './feeds';
import { FALLBACK_FEEDS } from './feedConstants';

export function prepareFeedUrls(opts: {
  region: string;
  category: string;
  query: string;
  hours: number;
  language: string;
  maxFeeds?: number;
}): string[] {
  const { region, category, query, hours, language, maxFeeds = 16 } = opts;

  let urls = getAllFeedsWithFallbacks({ region, category, query, hours, lang: language }, maxFeeds);

  // If Lithuania, ensure some Delfi fallback feeds are included at the front
  if ((region || '').toLowerCase() === 'lithuania') {
    const ltFallbacks = FALLBACK_FEEDS['lithuania'] || [];
    const delfiFallbacks = ltFallbacks.filter(u => typeof u === 'string' && u.includes('delfi'));
    // prepend up to two Delfi fallbacks if they aren't already present
    for (const u of delfiFallbacks.slice(0, 2).reverse()) {
      if (!urls.includes(u)) {
        urls = [u, ...urls];
      }
    }
  }

  // Limit feeds and randomize the rest to reduce load
  const MAX_FEEDS = maxFeeds;
  if (urls.length > MAX_FEEDS) {
    const keep = urls.slice(0, Math.min(4, urls.length));
    const rest = urls.slice(keep.length);
    // Fisher-Yates shuffle
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    urls = [...keep, ...rest.slice(0, Math.max(0, MAX_FEEDS - keep.length))];
  }

  return urls;
}

export function prioritizeAndFilterUrls(urls: string[], region: string): string[] {
  const googleUrls: string[] = [];
  const regionFallbackUrls: string[] = [];
  const otherUrls: string[] = [];
  const regionKey = (region || '').toLowerCase();
  const regionFallbacks = regionKey && FALLBACK_FEEDS[regionKey] ? FALLBACK_FEEDS[regionKey] : [];

  for (const u of urls) {
    // Skip empty or non-string entries which can be produced by disabled
    // Google News builders that intentionally return an empty string.
    if (!u || typeof u !== 'string' || u.trim() === '') {
      continue;
    }
    // Skip Google News feeds (removed)
    try {
      const h = new URL(u).hostname;
      if (h && h.includes('news.google.com')) {
        continue;
      }
    } catch {
      /* ignore malformed URL */
    }
    if (typeof u === 'string' && u.includes('news.google.com')) {
      continue;
    }

    if (regionFallbacks.includes(u)) {
      regionFallbackUrls.push(u);
      continue;
    }
    otherUrls.push(u);
  }

  // Prioritize region fallbacks, then other URLs
  return [...regionFallbackUrls, ...otherUrls];
}
export default (_req: any, res: any) => res.status(404).end();

import Parser from 'rss-parser';

// Shared parser and in-memory caches for feeds
export const parser = new Parser({
  timeout: 12000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36'
    }
  }
});

export const FEED_CACHE = new Map<string, { ts: number; value?: any; failed?: boolean; reason?: string }>();
export const FEED_CACHE_TTL_MS = 1000 * 60 * 60; // 60 minutes
export const FEED_FAIL_TTL_MS = 1000 * 60 * 5; // 5 minutes negative cache for failing feeds
export const FEED_FAIL_COUNTS = new Map<string, { count: number; ts: number }>();
export const FEED_FAIL_BLACKLIST_THRESHOLD = 3;

export type FeedCacheEntry = { ts: number; value?: any; failed?: boolean; reason?: string };

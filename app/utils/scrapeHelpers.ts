import * as cheerio from 'cheerio';

export const SCRAPE_CACHE = new Map<string, { ts: number; imageUrl?: string; error?: string }>();
export const SCRAPE_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export const SCRAPE_REQUESTS = new Map<string, number[]>(); // hostname -> timestamps
export const MAX_REQUESTS_PER_MINUTE = 10;
export const MAX_REQUESTS_PER_HOUR = 50;

export function checkRateLimit(hostname: string): boolean {
  const now = Date.now();
  const requests = SCRAPE_REQUESTS.get(hostname) || [];
  const recentRequests = requests.filter(ts => now - ts < 3600000);
  SCRAPE_REQUESTS.set(hostname, recentRequests);
  const lastMinute = recentRequests.filter(ts => now - ts < 60000);
  if (lastMinute.length >= MAX_REQUESTS_PER_MINUTE) return false;
  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) return false;
  return true;
}

export function recordRequest(hostname: string): void {
  const requests = SCRAPE_REQUESTS.get(hostname) || [];
  requests.push(Date.now());
  SCRAPE_REQUESTS.set(hostname, requests);
}

export function isValidImageUrl(url: string, baseUrl: string): boolean {
  try {
    const absoluteUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;
    const parsedUrl = new URL(absoluteUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;
    const pathname = parsedUrl.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.includes(ext));
    const hasImageKeywords = /\/image|\.image|img|photo|picture|media/i.test(pathname + parsedUrl.search);
    return hasImageExtension || hasImageKeywords;
  } catch (e) {
    return false;
  }
}

export function getScrapingStats(): { cacheSize: number; rateLimits: Record<string, number> } {
  const rateLimits: Record<string, number> = {};
  for (const [hostname, requests] of SCRAPE_REQUESTS.entries()) {
    rateLimits[hostname] = requests.length;
  }
  return { cacheSize: SCRAPE_CACHE.size, rateLimits };
}

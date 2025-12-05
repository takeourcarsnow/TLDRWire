// Article scraping utilities for extracting images from web pages

import * as cheerio from 'cheerio';
import logger from '../utils/logger';
import { SCRAPE_CACHE, SCRAPE_CACHE_TTL_MS, checkRateLimit, recordRequest, isValidImageUrl, getScrapingStats as _getScrapingStats } from './scrapeHelpers';
import { errorToString } from './errorUtils';

/**
 * Extract the best image from an article page
 */
export async function scrapeArticleImage(articleUrl: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = SCRAPE_CACHE.get(articleUrl);
    if (cached) {
      const age = Date.now() - cached.ts;
      if (age < SCRAPE_CACHE_TTL_MS) {
        if (cached.error) {
          return null;
        }
        if (cached.imageUrl) {
          return cached.imageUrl;
        }
      }
    }

    // Extract hostname for rate limiting
    let hostname = '';
    try {
      hostname = new URL(articleUrl).hostname;
    } catch (e: unknown) {
      SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: 'Invalid URL' });
      return null;
    }

    // Check rate limits
    if (!checkRateLimit(hostname)) {
      return null;
    }

    // Fetch the article page with improved timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000); // 5 second timeout for faster response

    const response = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: `HTTP ${response.status}` });
      return null;
    }

    const html = await response.text();
  recordRequest(hostname);

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Remove script and style elements to clean up the DOM
    $('script, style, noscript').remove();

    // Priority order for finding images (most specific to most general)
    const imageSelectors = [
      // Open Graph images (most reliable for articles)
      'meta[property="og:image"]',
      'meta[name="og:image"]',

      // Twitter Card images
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',

      // Article specific images
      'article img[src]',
      '.article img[src]',
      '.post img[src]',
      '.entry img[src]',

      // Hero/featured images
      '.hero img[src]',
      '.featured img[src]',
      '.featured-image img[src]',
      '.hero-image img[src]',

      // Common CMS selectors
      '.wp-post-image[src]',
      '.attachment-post-thumbnail[src]',
      '.entry-thumbnail img[src]',

      // Generic content images
      'main img[src]',
      '.content img[src]',
      '#content img[src]'
    ];

    for (const selector of imageSelectors) {
      try {
        if (selector.startsWith('meta[')) {
          // Handle meta tags
          const metaTag = $(selector).first();
          if (metaTag.length > 0) {
            const content = metaTag.attr('content');
            if (content && isValidImageUrl(content, articleUrl)) {
              SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), imageUrl: content });
              return content;
            }
          }
        } else {
          // Handle img tags
          const imgTag = $(selector).first();
          if (imgTag.length > 0) {
            const src = imgTag.attr('src');
            if (src && isValidImageUrl(src, articleUrl)) {
              // Skip very small images (likely icons)
              const width = parseInt(imgTag.attr('width') || '0');
              const height = parseInt(imgTag.attr('height') || '0');
              if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
                continue; // Skip small images
              }

              SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), imageUrl: src });
              return src;
            }
          }
        }
      } catch (e: unknown) {
        continue;
      }
    }

    // Fallback: look for the first reasonably-sized image in the article content
    try {
      const images = $('article img, .article img, .content img, main img').toArray();
      for (const img of images.slice(0, 5)) { // Check first 5 images
        const src = $(img).attr('src');
        if (src && isValidImageUrl(src, articleUrl)) {
          const width = parseInt($(img).attr('width') || '0');
          const height = parseInt($(img).attr('height') || '0');

          // Skip very small images
          if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
            continue;
          }

          SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), imageUrl: src });
          return src;
        }
      }
    } catch (e: unknown) {
      // Silently continue
    }

    SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: 'No image found' });
    return null;

  } catch (error: unknown) {
    SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: errorToString(error) });
    return null;
  }
}

export function getScrapingStats(): { cacheSize: number; rateLimits: Record<string, number> } {
  return _getScrapingStats();
}
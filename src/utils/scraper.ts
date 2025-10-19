// Article scraping utilities for extracting images from web pages

import * as cheerio from 'cheerio';
import logger from '../pages/api/logger';
import { SCRAPE_CACHE, SCRAPE_CACHE_TTL_MS, checkRateLimit, recordRequest, isValidImageUrl, getScrapingStats as _getScrapingStats } from './scrapeHelpers';

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
          console.log(`DEBUG: Cached scrape error for ${articleUrl}: ${cached.error}`);
          return null;
        }
        if (cached.imageUrl) {
          console.log(`DEBUG: Cached scraped image for ${articleUrl}: ${cached.imageUrl}`);
          return cached.imageUrl;
        }
      }
    }

    // Extract hostname for rate limiting
    let hostname = '';
    try {
      hostname = new URL(articleUrl).hostname;
    } catch (e) {
      console.log(`DEBUG: Invalid URL for scraping: ${articleUrl}`);
      SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: 'Invalid URL' });
      return null;
    }

    // Check rate limits
    if (!checkRateLimit(hostname)) {
      console.log(`DEBUG: Skipping scrape due to rate limit: ${articleUrl}`);
      return null;
    }

    console.log(`DEBUG: Scraping article for image: ${articleUrl}`);

    // Fetch the article page with improved timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log(`DEBUG: Scraping timed out for ${articleUrl}`);
    }, 8000); // Reduced timeout to 8 seconds for better responsiveness

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
      const error = `HTTP ${response.status}`;
      console.log(`DEBUG: Scrape failed for ${articleUrl}: ${error}`);
      SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error });
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
              console.log(`DEBUG: Found image via meta tag ${selector}: ${content}`);
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

              console.log(`DEBUG: Found image via selector ${selector}: ${src}`);
              SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), imageUrl: src });
              return src;
            }
          }
        }
      } catch (e) {
        console.log(`DEBUG: Error with selector ${selector}:`, e);
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

          console.log(`DEBUG: Found fallback image: ${src}`);
          SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), imageUrl: src });
          return src;
        }
      }
    } catch (e) {
      console.log(`DEBUG: Error in fallback image search:`, e);
    }

    console.log(`DEBUG: No suitable image found for article: ${articleUrl}`);
    SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: 'No image found' });
    return null;

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.log(`DEBUG: Scrape error for ${articleUrl}: ${errorMsg}`);
    SCRAPE_CACHE.set(articleUrl, { ts: Date.now(), error: errorMsg });
    return null;
  }
}

export function getScrapingStats(): { cacheSize: number; rateLimits: Record<string, number> } {
  return _getScrapingStats();
}
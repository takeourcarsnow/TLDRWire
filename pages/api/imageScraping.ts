import { scrapeArticleImage } from '../../app/utils/scraper';
import { NormalizedArticle } from './articleNormalization';

export interface CleanArticle {
  title: string;
  url: string;
  publishedAt: number;
  source: string;
  imageUrl: string | null;
}

// Persistent cache for scraped images (separate from API cache)
const SCRAPED_IMAGES_CACHE = new Map<string, { ts: number; imageUrl?: string; error?: boolean }>();
const SCRAPED_IMAGES_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const performImageScraping = async (
  topItems: NormalizedArticle[],
  cleanTopItems: CleanArticle[],
  enableImageScraping: boolean,
  options: {
    maxConcurrent?: number;
    delayBetweenRequests?: number;
    lazyLoad?: boolean;
  } = {}
): Promise<void> => {
  if (!enableImageScraping || !cleanTopItems.some(item => !item.imageUrl)) {
    return;
  }

  const { maxConcurrent = 4, delayBetweenRequests = 200, lazyLoad = false } = options;

  // Reduced delays and increased concurrency for faster processing

  // Scrape articles that don't have images (limit to reduce server load)
  const articlesToScrape = cleanTopItems
    .filter(item => !item.imageUrl)
    .slice(0, 5); // Limit to 5 articles for faster response

  if (articlesToScrape.length > 0) {
    if (lazyLoad) {
      // For lazy loading, start scraping in background without waiting
      scrapeImagesInBackground(articlesToScrape, topItems, cleanTopItems, maxConcurrent, delayBetweenRequests);
    } else {
      // Synchronous scraping - wait for completion
      await scrapeImagesWithConcurrency(articlesToScrape, topItems, cleanTopItems, maxConcurrent, delayBetweenRequests);
    }
  }
};

// Background scraping for lazy loading
const scrapeImagesInBackground = async (
  articlesToScrape: CleanArticle[],
  topItems: NormalizedArticle[],
  cleanTopItems: CleanArticle[],
  maxConcurrent: number,
  delayBetweenRequests: number
): Promise<void> => {
  try {
    await scrapeImagesWithConcurrency(articlesToScrape, topItems, cleanTopItems, maxConcurrent, delayBetweenRequests);
  } catch (error) {
    // Silently fail on background scraping
  }
};

// Concurrent scraping with controlled parallelism
const scrapeImagesWithConcurrency = async (
  articlesToScrape: CleanArticle[],
  topItems: NormalizedArticle[],
  cleanTopItems: CleanArticle[],
  maxConcurrent: number,
  delayBetweenRequests: number
): Promise<void> => {
  const results: Array<{ item: CleanArticle; imageUrl: string | null }> = [];

  // Process articles in batches to control concurrency
  for (let i = 0; i < articlesToScrape.length; i += maxConcurrent) {
    const batch = articlesToScrape.slice(i, i + maxConcurrent);

    // Start all requests in this batch concurrently
    const batchPromises = batch.map(async (item, batchIndex) => {
      // Add small delay between requests in the same batch
      if (batchIndex > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }

      try {
        const scrapedImageUrl = await scrapeArticleImageWithCache(item.url);
        return { item, imageUrl: scrapedImageUrl };
      } catch (error) {
        return { item, imageUrl: null };
      }
    });

    // Wait for this batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const { item, imageUrl } = result.value;
        if (imageUrl) {
          item.imageUrl = imageUrl;
          // Propagate back to the original topItems for summary generation
          const index = cleanTopItems.indexOf(item);
          if (index !== -1) {
            topItems[index].imageUrl = imageUrl;
          }
        }
      }
    }

    // Add delay between batches
    if (i + maxConcurrent < articlesToScrape.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests * 2));
    }
  }
};

// Enhanced scraping with persistent caching
const scrapeArticleImageWithCache = async (articleUrl: string): Promise<string | null> => {
  // Check persistent cache first
  const cached = SCRAPED_IMAGES_CACHE.get(articleUrl);
  if (cached) {
    const age = Date.now() - cached.ts;
    if (age < SCRAPED_IMAGES_CACHE_TTL) {
      if (cached.error) {
        return null; // Cached failure
      }
      if (cached.imageUrl) {
        return cached.imageUrl;
      }
    } else {
      // Remove expired cache entry
      SCRAPED_IMAGES_CACHE.delete(articleUrl);
    }
  }

  // Scrape the image
  const imageUrl = await scrapeArticleImage(articleUrl);

  // Cache the result (success or failure)
  if (imageUrl) {
    SCRAPED_IMAGES_CACHE.set(articleUrl, { ts: Date.now(), imageUrl });
  } else {
    // Cache negative result for shorter time (5 minutes)
    SCRAPED_IMAGES_CACHE.set(articleUrl, { ts: Date.now(), error: true });
  }

  return imageUrl;
};

// Get scraping statistics for monitoring
export function getImageScrapingStats(): { cacheSize: number; cacheHitRate: number } {
  const cacheSize = SCRAPED_IMAGES_CACHE.size;
  let cacheHits = 0;
  let totalRequests = 0;

  // This is a simple approximation - in a real implementation you'd track metrics
  // For now, we'll just return cache size
  return {
    cacheSize,
    cacheHitRate: 0 // Would need proper metrics tracking
  };
}
export default (_req: any, res: any) => res.status(404).end();

import { scrapeArticleImage } from '../../utils/scraper';
import { NormalizedArticle } from './articleNormalization';

export interface CleanArticle {
  title: string;
  url: string;
  publishedAt: number;
  source: string;
  imageUrl: string | null;
}

export const performImageScraping = async (
  topItems: NormalizedArticle[],
  cleanTopItems: CleanArticle[],
  enableImageScraping: boolean
): Promise<void> => {
  if (!enableImageScraping || !cleanTopItems.some(item => !item.imageUrl)) {
    return;
  }

  console.log('DEBUG: Starting article scraping for missing images');

  // Scrape articles that don't have images (limit to avoid overwhelming)
  const articlesToScrape = cleanTopItems
    .filter(item => !item.imageUrl)
    .slice(0, 10); // Limit scraping to first 10 articles without images

  if (articlesToScrape.length > 0) {
    console.log(`DEBUG: Scraping ${articlesToScrape.length} articles for images`);

    // Scrape in parallel but with a small delay between requests
    const scrapePromises = articlesToScrape.map(async (item, index) => {
      // Add small delay between requests to be respectful
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * index));
      }

      try {
        const scrapedImageUrl = await scrapeArticleImage(item.url);
        if (scrapedImageUrl) {
          item.imageUrl = scrapedImageUrl;
          // Propagate back to the original topItems for summary generation
          const index = cleanTopItems.indexOf(item);
          if (index !== -1) {
            topItems[index].imageUrl = scrapedImageUrl;
          }
          console.log(`DEBUG: Successfully scraped image for article: ${item.title.substring(0, 50)}`);
        }
      } catch (error) {
        console.log(`DEBUG: Failed to scrape image for article: ${item.title.substring(0, 50)} - ${error}`);
      }
    });

    // Wait for all scraping to complete (with timeout)
    try {
      await Promise.race([
        Promise.all(scrapePromises),
        new Promise(resolve => setTimeout(resolve, 15000)) // 15 second timeout for all scraping
      ]);
      console.log('DEBUG: Article scraping completed');
    } catch (error) {
      console.log('DEBUG: Article scraping timed out or failed:', error);
    }
  }
};
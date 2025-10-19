// Quick test script for article scraping
import { scrapeArticleImage } from './utils/scraper';

async function testScraping() {
  console.log('Testing article scraping...');

  // Test with a known article that should have images
  const testUrls = [
    'https://www.bbc.com/news/articles/c5y3x3x3x3x3', // This might not exist, but let's try a real one
    'https://www.theguardian.com/world/2024/oct/19/some-article' // This might not exist either
  ];

  for (const url of testUrls) {
    console.log(`\nTesting URL: ${url}`);
    try {
      const imageUrl = await scrapeArticleImage(url);
      if (imageUrl) {
        console.log(`✅ Found image: ${imageUrl}`);
      } else {
        console.log(`❌ No image found`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }
}

testScraping().catch(console.error);
// Helper function to extract image URLs from RSS item
export const extractImageUrl = (item: any): string | null => {
  try {
    // Check enclosure (common for podcasts/media)
    if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      const url = item.enclosure.url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        console.log('DEBUG: Found image in enclosure:', url);
        return url;
      }
    }

    // Check media content/thumbnail
    if (item['media:content'] && item['media:content'].url) {
      const url = item['media:content'].url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        console.log('DEBUG: Found image in media:content:', url);
        return url;
      }
    }
    if (item['media:thumbnail'] && item['media:thumbnail'].url) {
      const url = item['media:thumbnail'].url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        console.log('DEBUG: Found image in media:thumbnail:', url);
        return url;
      }
    }

    // Check for img tags in content
    const content = item.content || item['content:encoded'] || item.contentSnippet || '';
    if (content) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch && imgMatch[1]) {
        const url = imgMatch[1];
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          console.log('DEBUG: Found image in content HTML:', url);
          return url;
        }
      }
    }

    // Check for image field
    if (item.image && item.image.url) {
      const url = item.image.url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        console.log('DEBUG: Found image in image field:', url);
        return url;
      }
    }

    console.log('DEBUG: No valid image found for article:', item.title?.substring(0, 50));
    return null;
  } catch (e) {
    console.log('DEBUG: Error extracting image:', e);
    return null;
  }
};
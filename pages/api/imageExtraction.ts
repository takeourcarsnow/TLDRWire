// Helper function to extract image URLs from RSS item
export const extractImageUrl = (item: any): string | null => {
  try {
    // Check enclosure (common for podcasts/media)
    if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      const url = item.enclosure.url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
    }

    // Check media content/thumbnail
    if (item['media:content'] && item['media:content'].url) {
      const url = item['media:content'].url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
    }
    if (item['media:thumbnail'] && item['media:thumbnail'].url) {
      const url = item['media:thumbnail'].url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
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
          return url;
        }
      }
    }

    // Check for image field
    if (item.image && item.image.url) {
      const url = item.image.url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};
export default (_req: any, res: any) => res.status(404).end();

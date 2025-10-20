import { extractImageUrl } from './imageExtraction';

export interface NormalizedArticle {
  title: string;
  link: string;
  pubDate: number;
  source: string;
  imageUrl: string | null;
  raw: any;
}

export const normalizeArticles = (feedsResult: any): NormalizedArticle[] => {
  return (feedsResult?.items || []).map((it: any) => {
    const title = it.title || it['dc:title'] || it.description || '';
    const link = it.link || it.guid || (it.enclosure && it.enclosure.url) || '';
    const pubDate = it.pubDate ? new Date(it.pubDate).getTime() : (it.isoDate ? new Date(it.isoDate).getTime() : Date.now());
    let source = '';
    try {
      source = new URL(link).hostname.replace(/^www\./, '');
    } catch {
      source = it.creator || it.author || (it['dc:creator']) || (it.feedTitle) || '';
    }
    const imageUrl = extractImageUrl(it);
    return {
      title: String(title || '').trim(),
      link: String(link || '').trim(),
      pubDate: Number(pubDate || Date.now()),
      source,
      imageUrl,
      raw: it
    };
  });
};
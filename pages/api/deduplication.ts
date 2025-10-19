import { NormalizedArticle } from './articleNormalization';

export const deduplicateArticles = (articles: NormalizedArticle[]): NormalizedArticle[] => {
  const seen = new Set<string>();
  const deduped: NormalizedArticle[] = [];
  for (const article of articles) {
    const key = (article.title || '') + '::' + (article.link || '');
    const k = key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(article);
  }
  return deduped;
};
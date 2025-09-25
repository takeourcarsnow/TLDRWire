import { CATEGORY_FILTERS } from './constants';
import type { FeedUrlParams } from './feeds';

export interface Article {
  title?: string;
  snippet?: string;
  link?: string;
  pubDate?: string;
  _toks?: string[];
  _cluster?: number;
  [key: string]: any;
}

export interface ArticleMetadata {
  toks: string[];
}

export function timeOK(pubDate: string | Date | undefined, hoursWindow: number = 12): boolean {
  if (!pubDate) return false;
  const date = typeof pubDate === 'string' ? new Date(pubDate) : pubDate;
  if (isNaN(date.getTime())) return false;
  const elapsed = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return elapsed <= hoursWindow;
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.substring(0, max - 3) + '...';
}

export function domainFromLink(link?: string): string {
  if (!link) return '';
  try {
    return new URL(link).hostname;
  } catch {
    return '';
  }
}

export function normalizeGoogleNewsLink(link: string, regionCfg?: Partial<FeedUrlParams>): string {
  try {
    const u = new URL(link);
    if (u.hostname?.includes('news.google.com')) {
      if (!u.searchParams.has('hl') && regionCfg?.hl) u.searchParams.set('hl', regionCfg.hl);
      if (!u.searchParams.has('gl') && regionCfg?.gl) u.searchParams.set('gl', regionCfg.gl);
      if (!u.searchParams.has('ceid') && regionCfg?.ceid) u.searchParams.set('ceid', regionCfg.ceid);
      return u.toString();
    }
  } catch { /* ignore URL parse error */ }
  return link;
}

export function calculateCategoryRelevance(article: Article, category?: string): number {
  if (!category || category === 'top' || category === 'world') {
    return 1;
  }
  const filters = CATEGORY_FILTERS[category];
  if (!filters) return 1;

  const text = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();
  let score = 0;
  let matches = 0;

  for (const keyword of filters) {
    if (text.includes(keyword.toLowerCase())) {
      matches++;
      if ((article.title || '').toLowerCase().includes(keyword.toLowerCase())) {
        score += 2;
      } else {
        score += 1;
      }
    }
  }

  const normalizedScore = Math.min(1, score / 3);
  return matches > 0 ? Math.max(0.3, normalizedScore) : 0.1;
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','in','on','for','to','from','with','by','about','over','after','before','as','at','is','are','was','were','be','been','being','new','latest','update','breaking','report','says','said','may','might','could','will','would','vs','into','out','up','down','amid','under','more','than','as','it','its',
  'ir','bei','ar','bet','kad','jog','apie','kuris','kuri','kurie','kurias','tai','tas','ta','tie','tos','iki','nuo','po','per','dėl','už','be','yra','buvo','bus','naujas','nauja','nauji','naujos','praneša','sako','gal','gali','dėl',
]);

export function tokenizeTitle(title?: string): string[] {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && t.length > 2 && !STOPWORDS.has(t));
}

export function jaccardSim(aTokens: string[], bTokens: string[]): number {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach(t => { if (b.has(t)) inter++; });
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function dedupeArticles(articles: Article[], threshold: number = 0.58): Article[] {
  const kept: Article[] = [];
  for (const art of articles) {
    const toks = tokenizeTitle(art.title);
    let merged = false;
    for (const k of kept) {
      const sim = jaccardSim(toks, k._toks!);
      if (sim >= threshold) {
        // Merge into existing cluster
        k._cluster = (k._cluster || 1) + 1;
        merged = true;
        break;
      }
    }
    if (!merged) {
      art._toks = toks;
      art._cluster = 1;
      kept.push(art);
    }
  }
  return kept;
}

export function dedupeSummaryBullets(markdown: string, simThreshold: number = 0.78): string {
  if (!markdown || typeof markdown !== 'string') return markdown;
  const lines = markdown.split(/\r?\n/);
  const bulletRe = /^\s*[-*]\s+/;

  const kept: string[] = [];
  const keptMeta: ArticleMetadata[] = [];

  for (const line of lines) {
    if (!bulletRe.test(line)) {
      kept.push(line);
      continue;
    }

    const plain = line
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_#>]/g, '')
      .trim();

    const toks = tokenizeTitle(plain);
    let dup = false;
    for (const km of keptMeta) {
      const sim = jaccardSim(toks, km.toks);
      if (sim >= simThreshold) { dup = true; break; }
    }
    if (!dup) {
      kept.push(line);
      keptMeta.push({ toks });
    }
  }
  return kept.join('\n');
}
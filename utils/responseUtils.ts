import { ApiResponse } from '../types/tldr';

export function buildContextItemsAndLines(topItems: any[], uiLocale: string, maxContextItems = 8) {
  const contextItems = topItems.slice(0, Math.min(maxContextItems, topItems.length));
  const contextLines = contextItems.map((a: any, idx: number) => {
    const dateStr = a.isoDate ? new Date(a.isoDate).toLocaleString(uiLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const snip = (a.snippet || '').replace(/\s+/g, ' ');
    let line = `#${idx + 1} ${a.title}\nSource: ${a.source} | Published: ${dateStr}\nLink: ${a.link}\nSummary: ${snip}`;
    if (a.imageUrl) {
      line += `\n![${a.title}](${a.imageUrl})`;
    }
    return line;
  });

  return { contextItems, contextLines };
}

export function insertImagesIntoSummary(finalSummary: string, contextItems: any[]) {
  // Collect existing images to avoid duplicates
  const existingImages = new Set<string>();
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = imageRegex.exec(finalSummary)) !== null) {
    existingImages.add(match[1]);
  }

  const lines = finalSummary.split('\n');
  const result: string[] = [];
  const usedImages = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);

    if (line.match(/^(\s*[-*]\s+)(.+)$/)) {
      let bestMatch: any = null;
      let bestScore = 0;

      for (const article of contextItems) {
        if (!article.imageUrl || usedImages.has(article.imageUrl)) continue;

        const bulletText = line.replace(/^(\s*[-*]\s+)/, '').toLowerCase();
        const articleTitle = (article.title || '').toLowerCase();

        const bulletWords = bulletText.split(/\s+/);
        const titleWords = articleTitle.split(/\s+/);
        const overlap = bulletWords.filter((word: string) => 
          word.length > 3 && titleWords.some((titleWord: string) => titleWord.includes(word) || word.includes(titleWord))
        ).length;

        const score = overlap / Math.max(bulletWords.length, titleWords.length);

        if (score > bestScore && score > 0.2) {
          bestScore = score;
          bestMatch = article;
        }
      }

      if (bestMatch && !existingImages.has(bestMatch.imageUrl!)) {
        result.push(`![${bestMatch.title.replace(/[\[\]]/g, '')}](${bestMatch.imageUrl})`);
        usedImages.add(bestMatch.imageUrl!);
      }
    }
  }

  return result.join('\n');
}

export function computeTopSources(cleanTopItems: any[], maxSources = 5) {
  const hostCounts: Record<string, number> = {};
  for (const a of cleanTopItems) {
    let host = '';
    try { host = new URL(a.url).hostname; } catch { host = 'unknown'; }
    host = host.toLowerCase().replace(/^www\./, '');
    hostCounts[host] = (hostCounts[host] || 0) + 1;
  }
  return Object.entries(hostCounts).sort((a,b) => b[1] - a[1]).slice(0, maxSources).map(([host,count]) => `${host} (${count})`).join(', ');
}

export function createFallbackPayload(feeds: any, region: string, category: string | undefined, style: string, uiLocale: string, language: string, length: string | undefined, GEMINI_MODEL: string): ApiResponse {
  const fallbackLines = feeds.urls.slice(0, 20).map((u: string) => `- ${u}`);
  const summary = `TL;DR: Could not reliably fetch recent items for that selection. Showing attempted feed URLs instead (first 20):\n\n${fallbackLines.join('\n')}`;

  const payloadFallback: ApiResponse = {
    ok: true,
    meta: {
      region: region,
      category: (category || 'Top'),
      style,
      timeframeHours: 0,
      language,
      locale: uiLocale,
      usedArticles: 0,
      model: GEMINI_MODEL,
      length: (typeof length === 'string' ? length : 'medium')
    },
    summary
  };

  return payloadFallback;
}

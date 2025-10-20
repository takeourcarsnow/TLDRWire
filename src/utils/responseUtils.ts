import { ApiResponse, TopItem, Article } from '../types/tldr';

export function buildContextItemsAndLines(topItems: TopItem[], uiLocale: string, maxContextItems = 8) {
  const contextItems = topItems.slice(0, Math.min(maxContextItems, topItems.length));
  const contextLines = contextItems.map((item: TopItem, idx: number) => {
    // Prefer ISO date if present, otherwise try numeric pubDate
    let dateStr = '';
    try {
      const d = item.isoDate ? new Date(item.isoDate) : (typeof item.pubDate === 'number' ? new Date(item.pubDate) : (item.pubDate ? new Date(String(item.pubDate)) : null));
      if (d) {
        dateStr = d.toLocaleString(uiLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (_) {
      dateStr = '';
    }

    const snippet = (item.snippet || item.content || '').replace(/\s+/g, ' ');
    const link = item.link || item.url || '';
    const title = item.title || 'Untitled';
    const source = item.source || '';

    let line = `#${idx + 1} ${title}\nSource: ${source} | Published: ${dateStr}\nLink: ${link}\nSummary: ${snippet}`;
    if (item.imageUrl) {
      line += `\n![${title}](${item.imageUrl})`;
    }
    return line;
  });

  // Debug: log the number of context items and a short preview of the lines.
  try {
    // Use console.debug so this appears in server logs when LOG_LEVEL allows it.
    console.debug && console.debug('buildContextItemsAndLines', {
      count: contextItems.length,
      preview: contextLines.slice(0, 4).map((l) => String(l).slice(0, 240))
    });
  } catch (_) {}

  return { contextItems, contextLines };
}

export function insertImagesIntoSummary(finalSummary: string, contextItems: TopItem[]) {
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
      let bestMatch: TopItem | null = null;
      let bestScore = 0;

      for (const article of contextItems) {
        if (!article.imageUrl || usedImages.has(String(article.imageUrl))) continue;

        const bulletText = line.replace(/^(\s*[-*]\s+)/, '').toLowerCase();
        const articleTitle = (article.title || '').toLowerCase();

        const bulletWords = bulletText.split(/\s+/).filter(Boolean);
        const titleWords = articleTitle.split(/\s+/).filter(Boolean);
        const overlap = bulletWords.filter((word: string) =>
          word.length > 3 && titleWords.some((titleWord: string) => titleWord.includes(word) || word.includes(titleWord))
        ).length;

        const score = overlap / Math.max(bulletWords.length || 1, titleWords.length || 1);

        if (score > bestScore && score > 0.2) {
          bestScore = score;
          bestMatch = article;
        }
      }

      if (bestMatch && bestMatch.imageUrl && !existingImages.has(bestMatch.imageUrl)) {
        const safeTitle = (bestMatch.title || '').replace(/[\[\]]/g, '');
        result.push(`![${safeTitle}](${bestMatch.imageUrl})`);
        usedImages.add(bestMatch.imageUrl);
      }
    }
  }

  return result.join('\n');
}

export function computeTopSources(cleanTopItems: Article[], maxSources = 5) {
  const hostCounts: Record<string, number> = {};
  for (const a of cleanTopItems) {
    let host = '';
    try { host = new URL(a.url).hostname; } catch { host = String(a.url || 'unknown'); }
    host = host.toLowerCase().replace(/^www\./, '');
    hostCounts[host] = (hostCounts[host] || 0) + 1;
  }
  return Object.entries(hostCounts).sort((a,b) => b[1] - a[1]).slice(0, maxSources).map(([host,count]) => `${host} (${count})`).join(', ');
}

export function createFallbackPayload(feeds: { urls: string[] }, region: string, category: string | undefined, style: string, uiLocale: string, language: string, length: string | undefined, GEMINI_MODEL: string): ApiResponse {
  const fallbackLines = (feeds?.urls || []).slice(0, 20).map((u: string) => `- ${u}`);
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

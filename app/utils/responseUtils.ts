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

  const usedImages = new Set<string>();

  // Helper to find the best matching article for a given text
  const findBestMatchingArticle = (text: string, requireUnused = true): TopItem | null => {
    let bestMatch: TopItem | null = null;
    let bestScore = 0;

    const textLower = text.toLowerCase();
    // Include shorter words (2+ chars) for better matching with short titles
    const textWords = textLower.split(/\s+/).filter(w => w.length > 2);

    for (const article of contextItems) {
      if (!article.imageUrl) continue;
      if (requireUnused && (usedImages.has(String(article.imageUrl)) || existingImages.has(String(article.imageUrl)))) continue;

      const titleLower = (article.title || '').toLowerCase();
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      
      // Check for exact or near-exact title match first
      if (textLower === titleLower || textLower.includes(titleLower) || titleLower.includes(textLower)) {
        bestMatch = article;
        bestScore = 1;
        break;
      }
      
      const overlap = textWords.filter((word: string) =>
        titleWords.some((titleWord: string) => titleWord.includes(word) || word.includes(titleWord))
      ).length;

      // Use lower threshold (0.15) for better matching
      const score = overlap / Math.max(textWords.length || 1, titleWords.length || 1);

      if (score > bestScore && score > 0.15) {
        bestScore = score;
        bestMatch = article;
      }
    }

    return bestMatch;
  };

  // Split into article blocks (separated by --- with possible whitespace)
  const blocks = finalSummary.split(/\n---\s*\n/);
  const processedBlocks: string[] = [];

  for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
    const block = blocks[blockIdx];
    const lines = block.split('\n');
    let hasImage = lines.some(l => l.trim().startsWith('!['));
    
    // Check if this block has a bold header (article title) - allow trailing whitespace
    const headerLine = lines.find(l => l.match(/^\*\*(.+)\*\*\s*$/));
    
    if (headerLine && !hasImage) {
      const titleMatch = headerLine.match(/^\*\*(.+)\*\*\s*$/);
      if (titleMatch) {
        const articleTitle = titleMatch[1].trim();
        // For the last block, be more lenient with matching
        const isLastBlock = blockIdx === blocks.length - 1;
        const matchingArticle = findBestMatchingArticle(articleTitle, !isLastBlock);
        
        if (matchingArticle && matchingArticle.imageUrl) {
          // Find where to insert the image: after the summary paragraph, before the source link
          const newLines: string[] = [];
          let insertedImage = false;
          
          // Find the index of the source link line (last line matching [text](url))
          let sourceLinkIdx = -1;
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().match(/^\[.+\]\(.+\)$/)) {
              sourceLinkIdx = i;
              break;
            }
          }
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Insert image right before the source link
            if (!insertedImage && i === sourceLinkIdx) {
              const safeTitle = (matchingArticle.title || '').replace(/[\[\]]/g, '');
              newLines.push('');
              newLines.push(`![${safeTitle}](${matchingArticle.imageUrl})`);
              newLines.push('');
              usedImages.add(matchingArticle.imageUrl);
              insertedImage = true;
            }
            
            newLines.push(line);
          }
          
          // If we couldn't find a source link, append image at the end
          if (!insertedImage) {
            const safeTitle = (matchingArticle.title || '').replace(/[\[\]]/g, '');
            // Remove trailing empty lines before adding image
            while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
              newLines.pop();
            }
            newLines.push('');
            newLines.push(`![${safeTitle}](${matchingArticle.imageUrl})`);
            usedImages.add(matchingArticle.imageUrl);
          }
          
          processedBlocks.push(newLines.join('\n'));
          continue;
        }
      }
    }
    
    // Handle bullet point format (legacy)
    if (!headerLine) {
      const newLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        newLines.push(line);

        if (line.match(/^(\s*[-*]\s+)(.+)$/)) {
          const bulletText = line.replace(/^(\s*[-*]\s+)/, '');
          const matchingArticle = findBestMatchingArticle(bulletText);

          if (matchingArticle && matchingArticle.imageUrl) {
            const safeTitle = (matchingArticle.title || '').replace(/[\[\]]/g, '');
            newLines.push(`![${safeTitle}](${matchingArticle.imageUrl})`);
            usedImages.add(matchingArticle.imageUrl);
          }
        }
      }
      processedBlocks.push(newLines.join('\n'));
      continue;
    }
    
    processedBlocks.push(block);
  }

  return processedBlocks.join('\n---\n');
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

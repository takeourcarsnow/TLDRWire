import React, { useEffect, useRef, useCallback } from 'react';
import { ApiResponse } from '../hooks/useApi';

interface NewsOutputProps {
  isLoading: boolean;
  error: string | null;
  data: ApiResponse | null;
  lastRequest: any;
  compactMode: boolean;
}

// (Region mapping constant removed as it was unused and triggered ESLint no-unused-vars)

export function NewsOutput({ isLoading, error, data, lastRequest, compactMode }: NewsOutputProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  const renderSummary = useCallback((markdown: string) => {
    if (!summaryRef.current || !markdown) return;

    try {
      // Use marked and DOMPurify from global scope (loaded via script tags)
      const html = (window as any).DOMPurify.sanitize((window as any).marked.parse(markdown));
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const children = Array.from(temp.children);
      
      summaryRef.current.innerHTML = '';
      
      children.forEach((child, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'reveal-up';
        wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
        wrapper.appendChild(child);
        summaryRef.current!.appendChild(wrapper);
      });

      // Apply compact class if enabled
      if (compactMode) {
        summaryRef.current.classList.add('compact');
      } else {
        summaryRef.current.classList.remove('compact');
      }

      // Process links
      summaryRef.current.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        try {
          const rawHref = link.getAttribute('href') || '';
          if (rawHref && !/^https?:/i.test(rawHref)) {
            return;
          }
          const href = rawHref || '#';
          let url = new URL(href, window.location.href);
          let host = (url.hostname || '').replace(/^www\./, '');
          const currentText = (link.textContent || '').trim();
          const looksLikeUrl = /^https?:\/\//i.test(currentText) || currentText === href;
          // Also consider host-like text that ends with punctuation (e.g. "bbc.co.uk?")
          const endsWithPunct = /[.,;:!?]+$/.test(currentText);
          const looksLikeHostWithPunct = Boolean(host && currentText && currentText.toLowerCase().includes(host.toLowerCase()) && endsWithPunct);

          if (!currentText || looksLikeUrl || currentText.length > 42 || looksLikeHostWithPunct) {
            try {
              const prev = link.previousSibling;
              if (prev && prev.nodeType === Node.TEXT_NODE) {
                const txt = (prev.textContent || '');
                // Handle common broken markdown pattern: "[Label](" left in a text node before the link
                // e.g. "... [The New York Times](" and the link node contains the url/host only.
                const m = txt.match(/\[([^\]]+)\]\($/);
                if (m) {
                    // remove the trailing bracketed fragment from the previous text node
                    prev.textContent = txt.slice(0, m.index);
                    // Do NOT re-insert the original label text here. Instead ensure a single
                    // separating space so the favicon/link doesn't glue to preceding text.
                    try {
                      const prevTxt = (prev.textContent || '');
                      if (!/\s$/.test(prevTxt)) {
                        link.parentNode?.insertBefore(document.createTextNode(' '), link);
                      } else {
                        // normalize to a single trailing space
                        prev.textContent = prevTxt.replace(/\s+$/, ' ');
                      }
                    } catch (e) {}
                    // Remove any stray closing parenthesis that might follow the link
                    const next = link.nextSibling;
                    if (next && next.nodeType === Node.TEXT_NODE) {
                      const nextTxt = next.textContent || '';
                      if (/^\)/.test(nextTxt)) {
                        next.textContent = nextTxt.replace(/^\)+\s*/, '');
                      }
                    }
                } else {
                  // If previous sibling is a text node that doesn't end with whitespace,
                  // insert a separating space to avoid concatenation like "[BBC]bbc.co.uk".
                  if (txt.length > 0 && !/\s$/.test(txt)) {
                    link.parentNode?.insertBefore(document.createTextNode(' '), link);
                  }
                }
              }
            } catch (e) { /* ignore DOM adjust errors */ }
            link.textContent = (host || 'source').trim().replace(/[\uFFFD\uFEFF\u200B]+/g, '');
            // Helper: remove leading punctuation and stray replacement chars from a text node
            const trimLeadingPunctFromText = (textNode: Node | null) => {
              try {
                if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
                let t = (textNode.textContent || '');
                // strip common leading punctuation (with optional closing parens/brackets)
                const m = t.match(/^([)\]\.,;:!?\u2026]+)\s*/);
                if (m) {
                  t = t.slice(m[0].length);
                  (textNode as any).textContent = t;
                }
                // remove sole replacement/zero-width chars
                (textNode as any).textContent = (textNode as any).textContent.replace(/^[\uFFFD\uFEFF\u200B\u00A0\s]+/, '');
              } catch (e) {}
            };

            // Helper: if next sibling is an element whose first child is punctuation-only, trim it
            const trimLeadingPunctFromElementFirstChild = (el: Node | null) => {
              try {
                if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
                const first = (el as Element).firstChild;
                if (first && first.nodeType === Node.TEXT_NODE) {
                  trimLeadingPunctFromText(first);
                  // If the element now starts empty, remove that empty text node
                  if (((first.textContent || '').trim().length) === 0) {
                    (el as Element).removeChild(first);
                  }
                }
              } catch (e) {}
            };

            try {
              const nextNode = link.nextSibling;
              trimLeadingPunctFromText(nextNode);
              if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE) {
                trimLeadingPunctFromElementFirstChild(nextNode);
              }

              // Aggressive clean: remove punctuation-only siblings (up to 3) around the link
              const removePunctSiblings = (node: Node | null) => {
                try {
                  let n = node;
                  for (let i = 0; i < 3 && n; i++) {
                    if (n.nodeType === Node.TEXT_NODE) {
                      const txt = (n.textContent || '').trim();
                      if (/^[\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+[\u00A0\uFEFF\uFFFD\u200B\s]*$/.test(txt)) {
                        const toRemove = n;
                        n = n.nextSibling;
                        toRemove.parentNode?.removeChild(toRemove);
                        continue;
                      }
                    }
                    n = n.nextSibling;
                  }
                } catch (e) {}
              };
              removePunctSiblings(link.nextSibling);
              // Also check previous siblings for stray punctuation glued to end
              const removePrevPunct = (node: Node | null) => {
                try {
                  let n = node;
                  for (let i = 0; i < 3 && n; i++) {
                    if (n.nodeType === Node.TEXT_NODE) {
                      const txt = (n.textContent || '');
                      // remove trailing punctuation-only content
                      if (/([\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+)\s*$/.test(txt)) {
                        n.textContent = txt.replace(/([\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+)\s*$/, '');
                      }
                    }
                    n = n.previousSibling;
                  }
                } catch (e) {}
              };
              removePrevPunct(link.previousSibling);
            } catch (e) {}
          }
          link.title = `Open ${host || 'link'} in new tab`;
          // Handle Google News links
          const isGNews = /(^|\.)news\.google\.com$/i.test(url.hostname || '');
          if (isGNews) {
            // Try to resolve to publisher via url= param
            const raw = url.searchParams.get('url');
            if (raw) {
              try {
                const decoded = decodeURIComponent(raw);
                const candidate = new URL(decoded);
                url = candidate;
                host = (url.hostname || '').replace(/^www\./, '');
                if (host && host !== (url.hostname || '').replace(/^www\./, '')) {
                  const txt = (link.textContent || '').trim();
                  if (!txt || txt === host || txt.length > 42) {
                    link.textContent = host || 'source';
                  }
                }
              } catch { /* Keep original Google News link on parse error */ }
            }
            link.setAttribute('href', url.toString());
          }
          // Add favicon/logo
          if (host) {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
            try {
              // If the link is already inside our wrapper, skip
              const parentEl = link.parentElement as HTMLElement | null;
              if (parentEl && parentEl.classList && parentEl.classList.contains('tldrwire-source')) {
                // ensure img exists as first child
                const first = parentEl.firstElementChild as HTMLElement | null;
                if (first && first.tagName !== 'IMG') {
                  const img = document.createElement('img');
                  img.src = faviconUrl;
                  img.alt = `${host} favicon`;
                  img.style.width = '16px';
                  img.style.height = '16px';
                  img.style.verticalAlign = 'middle';
                  img.style.marginRight = '6px';
                  parentEl.insertBefore(img, parentEl.firstChild);
                }
              } else {
                // Create a block wrapper so favicon+link always appear on their own line
                const wrapper = document.createElement('div');
                wrapper.className = 'tldrwire-source';
                wrapper.style.display = 'block';
                wrapper.style.marginTop = '6px';
                wrapper.style.marginBottom = '2px';

                const img = document.createElement('img');
                img.src = faviconUrl;
                img.alt = `${host} favicon`;
                img.dataset.tldrHost = host;
                img.style.width = '16px';
                img.style.height = '16px';
                img.style.verticalAlign = 'middle';
                img.style.marginRight = '6px';
                // Apply theme-aware inversion for specific hosts (e.g., nytimes.com)
                const applyThemeToFavicon = (image: HTMLImageElement | null) => {
                  try {
                    if (!image) return;
                    const h = (image.dataset.tldrHost || '').toLowerCase();
                    const theme = document.documentElement.getAttribute('data-theme') || 'light';
                    if (h.includes('nytimes.com')) {
                      if (theme === 'dark') {
                        image.style.filter = 'invert(1)';
                      } else {
                        image.style.filter = '';
                      }
                    }
                  } catch (e) {}
                };
                applyThemeToFavicon(img);
                // Install a single global observer once to react to theme changes
                try {
                  if (!(window as any).__tldrThemeObserverInitialized) {
                    const obs = new MutationObserver(() => {
                      document.querySelectorAll<HTMLImageElement>('.tldrwire-source img[data-tldr-host]').forEach((im) => applyThemeToFavicon(im));
                    });
                    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                    (window as any).__tldrThemeObserverInitialized = true;
                  }
                } catch (e) {}

                // Insert wrapper before the link and move the link into it
                link.parentNode?.insertBefore(wrapper, link);
                wrapper.appendChild(img);
                wrapper.appendChild(link);
              }
            } catch (e) { /* ignore DOM errors */ }
          }
        } catch {
          const t = (link.textContent || '').trim();
          if (t.length > 42) link.textContent = t.slice(0, 40) + '…';
          link.title = 'Open link in new tab';
        }
      });
    } catch (error) {
      console.error('Error rendering markdown:', error);
      if (summaryRef.current) {
        summaryRef.current.textContent = markdown;
      }
    }
  }, [compactMode]);

  useEffect(() => {
    if (data?.summary) {
      renderSummary(data.summary);
    }
  }, [data?.summary, compactMode, renderSummary]);

  const copyToClipboard = async () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      // Show success message somehow
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Copy failed - try selecting text manually');
    }
  };

  const shareContent = async () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to share');
      return;
    }
    
    const shareData = {
      title: `TLDRWire: ${lastRequest?.category || 'Top'} Stories`,
      text: text.slice(0, 500) + (text.length > 500 ? '...' : ''),
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        alert('Sharing failed');
      }
    }
  };

  const exportAsText = () => {
    const text = summaryRef.current?.innerText || '';
    if (!text.trim()) {
      alert('No summary to export');
      return;
    }
    
    const timestamp = new Date().toISOString();
  const content = `TLDRWire Summary\nGenerated: ${timestamp}\nRegion: ${lastRequest?.region || 'Unknown'}\nCategory: ${lastRequest?.category || 'Unknown'}\nStyle: ${lastRequest?.style || 'Unknown'}\n\n${text}\n\n---\nGenerated by TLDRWire (${window.location.href})`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    const region = lastRequest?.region?.replace(/\s+/g, '-').toLowerCase() || 'global';
    const category = lastRequest?.category?.replace(/\s+/g, '-').toLowerCase() || 'news';
  link.download = `tldrwire-${region}-${category}-${date}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printSummary = () => {
    window.print();
  };

  const renderMeta = () => {
    if (!data?.meta) return null;

    const items = [
      { icon: '📍', label: 'Region', value: data.meta.region },
      { icon: '📂', label: 'Category', value: data.meta.category },
      { icon: '✍️', label: 'Style', value: data.meta.style },
      { icon: '⏰', label: 'Window', value: `${data.meta.timeframeHours}h` },
      { icon: '📊', label: 'Articles', value: data.meta.usedArticles },
      data.meta.length ? { icon: '📏', label: 'Length', value: data.meta.length } : null,
      { icon: '🤖', label: 'Model', value: data.meta.model }
    ].filter(Boolean);

    return (
      <div className="meta">
        {items.map((item, idx) => (
          <span key={idx} className="meta-item">
            {item!.icon} {item!.value}
          </span>
        ))}
      </div>
    );
  };

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="loader" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true"></span>
          <div className="message">
            <strong>Analyzing latest news…</strong>
            <span className="subtle">This usually takes a few seconds</span>
            <div className="progress" aria-hidden="true"></div>
          </div>
        </div>
      );
    }

    if (error) {
      let message = '❌ ';
      if (error.includes('GEMINI_API_KEY')) {
        message += 'Server configuration error. Please contact support.';
      } else if (error.toLowerCase().includes('timed out') || error.toLowerCase().includes('timeout')) {
        message += 'Request timed out. Please try again.';
      } else if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        message += 'Network error. Please check your connection and try again.';
      } else {
        message += `Error: ${error}`;
      }
      
      return (
        <div className="error fade-in">
          {message}
        </div>
      );
    }

    if (data?.cached) {
      return (
        <div className="success fade-in">
          📱 Loaded from cache for faster response
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderMeta()}
      <div id="status" role="alert" aria-live="assertive">
        {renderStatus()}
      </div>
      
      {!isLoading && !error && (
        <div className="btn-group" style={{ marginBottom: '16px', gap: '8px', justifyContent: 'space-between' }}>
          <div className="btn-group" style={{ flex: 1 }}>
            <button className="secondary" type="button" title="Copy summary" onClick={copyToClipboard}>
              📋 Copy
            </button>
            <button className="secondary" type="button" title="Share summary" onClick={shareContent}>
              🔗 Share
            </button>
            <button className="secondary" type="button" title="Export as text" onClick={exportAsText}>
              💾 Export
            </button>
            <button className="secondary" type="button" title="Print summary" onClick={printSummary}>
              🖨️ Print
            </button>
          </div>
        </div>
      )}
      
      <article 
        ref={summaryRef}
        className="summary" 
        aria-label="News summary"
        aria-busy={isLoading}
      >
        {isLoading && (
          <>
            <div className="skeleton" style={{ height: '20px', width: '55%', margin: '10px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '100%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '96%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '90%', margin: '8px 0 16px' }}></div>
            <div className="skeleton" style={{ height: '16px', width: '45%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '98%', margin: '8px 0' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '93%', margin: '8px 0' }}></div>
          </>
        )}
      </article>
    </>
  );
}
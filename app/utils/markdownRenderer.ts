import { applyThemeToFavicon, ensureThemeObserver, makeFaviconUrl } from './linkHelpers';
import { wrapImageInParagraph } from './imageHelpers';
import type { Article } from '../types/tldr';

export function renderMarkdownToElement(el: HTMLDivElement | null, markdown: string | undefined, articles?: Article[]): void {
  if (!el || !markdown) return;
  try {
    // Log raw markdown for local debugging (will show in browser console).
    // Trim to avoid extremely long logs.
    console.debug && console.debug('renderMarkdownToElement - raw markdown', String(markdown).slice(0, 2000));
  } catch (_) {}
  try {
    const mdLib = (window as any).marked;
    const sanitizer = (window as any).DOMPurify;
    const html = sanitizer ? sanitizer.sanitize(mdLib ? mdLib.parse(markdown) : markdown) : (mdLib ? mdLib.parse(markdown) : markdown);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const children = Array.from(temp.children);
    el.innerHTML = '';

    // Precompute canonical article URLs (host + full URL) so that source
    // links in the rendered summary always point to the exact article,
    // even if the LLM simplified or corrupted the link (e.g. using an
    // image CDN URL instead of the article URL). We keep this list in
    // order so we can align the N source links in the summary with the
    // first N articles returned from the API.
    const articleMeta: { host: string; url: string }[] = Array.isArray(articles)
      ? articles.map((a) => {
          try {
            const u = new URL(a.url);
            const host = (u.hostname || '').replace(/^www\./, '');
            return { host, url: u.toString() };
          } catch {
            return null as any;
          }
        }).filter(Boolean)
      : [];
    let nextArticleIdx = 0;

    children.forEach((child, idx) => {
      if (child.tagName === 'UL') {
        try {
          // Clone the UL and remove any trailing empty <li> nodes only.
          const ulClone = child.cloneNode(true) as HTMLElement;
          const lis = Array.from(ulClone.querySelectorAll('li')) as HTMLLIElement[];
          // Remove only if the last li is empty or whitespace-only. Do not remove the last real item.
          if (lis.length > 0) {
            const last = lis[lis.length - 1];
            // If last li is empty, remove it and log for debugging so we can see
            // when the renderer strips a trailing empty bullet.
            if (!last.textContent || last.textContent.trim().length === 0) {
              try { console.warn && console.warn('markdownRenderer: removing trailing empty <li>'); } catch (_) {}
              last.remove();
            }
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'reveal-up';
          wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
          wrapper.appendChild(ulClone);
          el.appendChild(wrapper);
          return;
        } catch (e) {}
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'reveal-up';
      wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
      wrapper.appendChild(child);
      el.appendChild(wrapper);
    });

    // Enhanced link processing
    el.querySelectorAll<HTMLAnchorElement>('a').forEach((link: HTMLAnchorElement) => {
      try {
        // Helper: remove a single surrounding '(' before the node and ')' after the node
        // if they exist as adjacent text nodes (or are the trailing/leading part of such nodes).
        const removeSurroundingParens = (node: Node | null) => {
          try {
            if (!node || !node.parentNode) return;
            const prev = node.previousSibling as Node | null;
            const next = node.nextSibling as Node | null;

            if (prev && prev.nodeType === Node.TEXT_NODE) {
              const txt = String(prev.textContent || '');
              // If previous text ends with '(' optionally followed by whitespace, strip it
              if (/\(\s*$/.test(txt)) {
                const newTxt = txt.replace(/\(\s*$/, '');
                if (newTxt.trim().length === 0) prev.parentNode?.removeChild(prev);
                else prev.textContent = newTxt;
              }
            }

            if (next && next.nodeType === Node.TEXT_NODE) {
              const txt2 = String(next.textContent || '');
              // If next text begins with ')' optionally preceded by whitespace, strip it
              if (/^\s*\)/.test(txt2)) {
                const newTxt2 = txt2.replace(/^\s*\)/, '');
                if (newTxt2.trim().length === 0) next.parentNode?.removeChild(next);
                else next.textContent = newTxt2;
              }
            }
          } catch (_) { /** ignore */ }
        };
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const rawHref = link.getAttribute('href') || '';
        if (rawHref && !/^https?:/i.test(rawHref)) return;

        let url = new URL(rawHref || '#', window.location.href);
        let host = (url.hostname || '').replace(/^www\./, '');
        const currentText = (link.textContent || '').trim();

        const looksLikeHostLabel = !currentText || /^[a-z0-9_.-]+$/i.test(currentText);

        let isBrokenUrl = false;
        try {
          isBrokenUrl = !url.hostname || url.hostname.endsWith('.') || url.hostname.includes('..') || url.hostname.startsWith('.') || (url.protocol !== 'https:' && url.protocol !== 'http:');
        } catch {
          isBrokenUrl = true;
        }

        if (looksLikeHostLabel && isBrokenUrl) {
          link.style.display = 'none';
          return;
        }

        // Heuristic: treat most links in the generated summary as
        // "source" links for individual articles and realign them to
        // the canonical article URLs from the API payload. This fixes
        // cases where the LLM accidentally uses the image CDN URL (for
        // example, i.guim.co.uk) instead of the article URL for the
        // last item, which breaks the source link and image.
        let metaForThis: { host: string; url: string } | null = null;
        let isSourceLink = false;
        if (articleMeta.length && nextArticleIdx < articleMeta.length) {
          try {
            const parentText = (link.parentElement?.textContent || '').trim().toLowerCase();
            const textLower = currentText.toLowerCase();

            // Looks like a standalone host or short label, not an
            // arbitrary inline hyperlink.
            const parentIsShort = parentText.length <= 80;

            isSourceLink = looksLikeHostLabel && parentIsShort;

            if (isSourceLink && nextArticleIdx < articleMeta.length - 1) {
              metaForThis = articleMeta[nextArticleIdx] || null;
              if (metaForThis) {
                nextArticleIdx++;
                try {
                  const canonical = new URL(metaForThis.url);
                  url = canonical;
                  host = metaForThis.host || (canonical.hostname || '').replace(/^www\./, '');
                } catch {}
              }
            }
          } catch {}
        }

        // Hide the source of the last result if it's broken
        if (isSourceLink && !metaForThis) {
          link.style.display = 'none';
          return;
        }

        if (!currentText || currentText.length > 42) link.textContent = (host || 'source').trim();
        link.title = `Open ${host || 'link'} in new tab`;

        const isGNews = /(^|\.)news\.google\.com$/i.test(url.hostname || '');
        if (isGNews && !metaForThis) {
          const raw = url.searchParams.get('url');
          if (raw) {
            try {
              const decoded = decodeURIComponent(raw);
              const candidate = new URL(decoded);
              url = candidate;
              host = (url.hostname || '').replace(/^www\./, '');
              if (!link.textContent || link.textContent.length > 42) {
                link.textContent = host || 'source';
              }
            } catch {}
          }
          link.setAttribute('href', url.toString());
        }

        if (metaForThis) {
          const faviconUrl = makeFaviconUrl(url);
          try {
            const parentEl = link.parentElement as HTMLElement | null;
            if (parentEl && parentEl.classList && parentEl.classList.contains('tldrwire-source')) {
              const first = parentEl.firstElementChild as HTMLElement | null;
              if (first && first.tagName !== 'IMG') {
                const img = document.createElement('img');
                img.src = faviconUrl;
                img.alt = `${host} favicon`;
                img.style.width = '16px';
                img.style.height = '16px';
                img.style.verticalAlign = 'middle';
                img.style.marginRight = '6px';
                img.onerror = () => { img.style.display = 'none'; };
                parentEl.insertBefore(img, parentEl.firstChild);
                // Remove stray parentheses that were surrounding the link in the original text
                removeSurroundingParens(link);
              }
            } else {
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
              img.onerror = () => { img.style.display = 'none'; };

              applyThemeToFavicon(img);
              ensureThemeObserver();

              // Remove parens from the original location around the link before moving it
              removeSurroundingParens(link);

              link.parentNode?.insertBefore(wrapper, link);
              wrapper.appendChild(img);
              wrapper.appendChild(link);
            }
          } catch {}
        }
      } catch {
        const t = (link.textContent || '').trim();
        // Hide broken source links
        if (t && /^[a-z0-9_.-]+$/i.test(t) && (link.parentElement?.textContent || '').trim().length <= 80) {
          link.remove();
          return;
        }
        if (t.length > 42) link.textContent = t.slice(0, 40) + '…';
        link.title = 'Open link in new tab';
      }
    });

    // Images
    el.querySelectorAll<HTMLImageElement>('img').forEach((img: HTMLImageElement) => {
      if (img.src && !img.src.includes('favicon')) {
        try {
          const url = new URL(img.src);
          if (!url.hostname) {
            img.style.display = 'none';
          } else {
            wrapImageInParagraph(img);
          }
        } catch {
          img.style.display = 'none';
        }
      }
    });

    // Clean up any remaining broken markdown syntax at the end
    el.innerHTML = el.innerHTML.replace(/!\[.*$/g, '').replace(/\[.*$/g, '');
  } catch (err) {
    if (el) el.textContent = markdown || '';
  }
}

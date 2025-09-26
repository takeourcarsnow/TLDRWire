import React, { useEffect, useRef, useCallback } from 'react';


interface Props {
  summary?: string | null;
  isLoading: boolean;
  summaryRef: React.RefObject<HTMLDivElement>;
}

export default function SummaryRenderer({ summary, isLoading, summaryRef }: Props) {
  const internalRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const usedRef: React.RefObject<HTMLDivElement> = (summaryRef || internalRef) as React.RefObject<HTMLDivElement>;
    if (!usedRef.current || !summary) return;

    try {
      const html = (window as any).DOMPurify.sanitize((window as any).marked.parse(summary));
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const children = Array.from(temp.children);

      usedRef.current.innerHTML = '';

      children.forEach((child, idx) => {
        if (child.tagName === 'UL') {
          // Clone the ul and remove the last li
          const ulClone = child.cloneNode(true) as HTMLElement;
          const lis = ulClone.querySelectorAll('li');
          if (lis.length > 0) {
            lis[lis.length - 1].remove();
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'reveal-up';
          wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
          wrapper.appendChild(ulClone);
          usedRef.current!.appendChild(wrapper);
        } else {
          const wrapper = document.createElement('div');
          wrapper.className = 'reveal-up';
          wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
          wrapper.appendChild(child);
          usedRef.current!.appendChild(wrapper);
        }
      });


      usedRef.current.querySelectorAll<HTMLAnchorElement>('a').forEach((link: HTMLAnchorElement) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        try {
          const rawHref = link.getAttribute('href') || '';
          if (rawHref && !/^https?:/i.test(rawHref)) return;
          const href = rawHref || '#';
          let url = new URL(href, window.location.href);
          let host = (url.hostname || '').replace(/^www\./, '');
          const currentText = (link.textContent || '').trim();

          if (!currentText || currentText.length > 42) {
            link.textContent = (host || 'source').trim();
          }

          link.title = `Open ${host || 'link'} in new tab`;

          const isGNews = /(^|\.)news\.google\.com$/i.test(url.hostname || '');
          if (isGNews) {
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

          if (host) {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
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
                  parentEl.insertBefore(img, parentEl.firstChild);
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

                const applyThemeToFavicon = (image: HTMLImageElement | null) => {
                  try {
                    if (!image) return;
                    const h = (image.dataset.tldrHost || '').toLowerCase();
                    const theme = document.documentElement.getAttribute('data-theme') || 'light';
                    if (h.includes('nytimes.com')) {
                      if (theme === 'dark') image.style.filter = 'invert(1)';
                      else image.style.filter = '';
                    }
                  } catch {}
                };
                applyThemeToFavicon(img);

                try {
                  if (!(window as any).__tldrThemeObserverInitialized) {
                    const obs = new MutationObserver(() => {
                      document.querySelectorAll<HTMLImageElement>('.tldrwire-source img[data-tldr-host]').forEach((im) => applyThemeToFavicon(im));
                    });
                    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                    (window as any).__tldrThemeObserverInitialized = true;
                  }
                } catch {}

                link.parentNode?.insertBefore(wrapper, link);
                wrapper.appendChild(img);
                wrapper.appendChild(link);
              }
            } catch {}
          }
        } catch {
          const t = (link.textContent || '').trim();
          if (t.length > 42) link.textContent = t.slice(0, 40) + '…';
          link.title = 'Open link in new tab';
        }
      });
    } catch (error) {
      console.error('Error rendering markdown:', error);
      if (usedRef.current) usedRef.current.textContent = summary;
    }
  }, [summary, summaryRef]);

  return (
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
  );
}

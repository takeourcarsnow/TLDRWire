// Utility functions for rendering and processing content

/**
 * Renders markdown content to an HTML element with sanitization and link processing
 */
export const renderMarkdownToElement = (
  el: HTMLDivElement | null,
  markdown: string | undefined
): void => {
  if (!el || !markdown) return;
  try {
    const mdLib = (window as any).marked;
    const sanitizer = (window as any).DOMPurify;
    const html = sanitizer ? sanitizer.sanitize(mdLib ? mdLib.parse(markdown) : markdown) : (mdLib ? mdLib.parse(markdown) : markdown);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const children = Array.from(temp.children);
    el.innerHTML = '';

    children.forEach((child, idx) => {
      // If this child is a UL, clone and remove the last LI to match main output behaviour
      if (child.tagName === 'UL') {
        try {
          const ulClone = child.cloneNode(true) as HTMLElement;
          const lis = ulClone.querySelectorAll('li');
          if (lis.length > 0) {
            lis[lis.length - 1].remove();
          }
          const wrapper = document.createElement('div');
          wrapper.className = 'reveal-up';
          wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
          wrapper.appendChild(ulClone);
          el.appendChild(wrapper);
          return;
        } catch (e) {
          // fallback to normal handling below
        }
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'reveal-up';
      wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
      wrapper.appendChild(child);
      el.appendChild(wrapper);
    });

    // Enhanced link and favicon processing to match SummaryRenderer behaviour
    el.querySelectorAll<HTMLAnchorElement>('a').forEach((link: HTMLAnchorElement) => {
      try {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const rawHref = link.getAttribute('href') || '';
        if (rawHref && !/^https?:/i.test(rawHref)) return;
        let url = new URL(rawHref || '#', window.location.href);
        let host = (url.hostname || '').replace(/^www\./, '');
        const currentText = (link.textContent || '').trim();

        // Shorten long link text to the host when appropriate
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

    // Handle image loading errors gracefully
    el.querySelectorAll<HTMLImageElement>('img').forEach((img: HTMLImageElement) => {
      if (img.src && !img.src.includes('favicon')) { // Skip favicon images
        // Wrap the image in a centered paragraph
        const wrapper = document.createElement('p');
        wrapper.style.textAlign = 'center';
        wrapper.style.margin = '10px 0';
        wrapper.style.clear = 'both'; // Ensure it doesn't float with text
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        img.onerror = () => {
          console.log('DEBUG: Image failed to load:', img.src);
          wrapper.style.display = 'none'; // Hide the wrapper if image fails
        };
        img.onload = () => {
          console.log('DEBUG: Image loaded successfully:', img.src);
        };
      }
    });
  } catch (err) {
    if (el) el.textContent = markdown || '';
  }
};
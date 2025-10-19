import { applyThemeToFavicon, ensureThemeObserver, makeFaviconUrl } from './linkHelpers';
import { wrapImageInParagraph } from './imageHelpers';

export function renderMarkdownToElement(el: HTMLDivElement | null, markdown: string | undefined): void {
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
      if (child.tagName === 'UL') {
        try {
          const ulClone = child.cloneNode(true) as HTMLElement;
          const lis = ulClone.querySelectorAll('li');
          if (lis.length > 0) lis[lis.length - 1].remove();
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
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const rawHref = link.getAttribute('href') || '';
        if (rawHref && !/^https?:/i.test(rawHref)) return;
        let url = new URL(rawHref || '#', window.location.href);
        let host = (url.hostname || '').replace(/^www\./, '');
        const currentText = (link.textContent || '').trim();

        if (!currentText || currentText.length > 42) link.textContent = (host || 'source').trim();
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

              applyThemeToFavicon(img);
              ensureThemeObserver();

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

    // Images
    el.querySelectorAll<HTMLImageElement>('img').forEach((img: HTMLImageElement) => {
      if (img.src && !img.src.includes('favicon')) {
        wrapImageInParagraph(img);
      }
    });
  } catch (err) {
    if (el) el.textContent = markdown || '';
  }
}

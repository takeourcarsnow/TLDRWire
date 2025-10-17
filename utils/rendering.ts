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
      const wrapper = document.createElement('div');
      wrapper.className = 'reveal-up';
      wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
      wrapper.appendChild(child);
      el.appendChild(wrapper);
    });

    // Keep link processing lightweight; delegate complex behaviour to NewsOutput when available
    el.querySelectorAll('a').forEach((link) => {
      try {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const rawHref = link.getAttribute('href') || '';
        if (rawHref && !/^https?:/i.test(rawHref)) return;
        const href = rawHref || '#';
        const url = new URL(href, window.location.href);
        const host = (url.hostname || '').replace(/^www\./, '');
        link.title = `Open ${host || 'link'} in new tab`;
      } catch (e) {
        // ignore link processing errors
      }
    });
  } catch (err) {
    if (el) el.textContent = markdown || '';
  }
};
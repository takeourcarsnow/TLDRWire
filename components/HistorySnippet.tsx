import React, { useRef, useEffect } from 'react';

interface HistorySnippetProps {
  markdown: string;
}

function HistorySnippet({ markdown }: HistorySnippetProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const html = (window as any).DOMPurify.sanitize((window as any).marked.parse(markdown || ''));
      el.innerHTML = html;
      // Shorten long text visually
      el.querySelectorAll('a').forEach((link) => {
        try {
          const rawHref = link.getAttribute('href') || '';
          if (rawHref && !/^https?:/i.test(rawHref)) return;
          const url = new URL(rawHref, window.location.href);
          const host = (url.hostname || '').replace(/^www\./, '');
          link.title = `Open ${host}`;
          // Add favicon
          const img = document.createElement('img');
          img.src = `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
          img.alt = host;
          img.style.width = '14px';
          img.style.height = '14px';
          img.style.verticalAlign = 'middle';
          img.style.marginRight = '6px';
          link.parentNode?.insertBefore(img, link);
        } catch { /* ignore per-link processing errors */ }
      });
    } catch {
      el.textContent = markdown;
    }
  }, [markdown]);

  return <div ref={ref} className="history-snippet" />;
}

export default HistorySnippet;
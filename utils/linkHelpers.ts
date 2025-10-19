export function applyThemeToFavicon(image: HTMLImageElement | null) {
  try {
    if (!image) return;
    const h = (image.dataset.tldrHost || '').toLowerCase();
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    if (h.includes('nytimes.com')) {
      if (theme === 'dark') image.style.filter = 'invert(1)';
      else image.style.filter = '';
    }
  } catch {}
}

export function ensureThemeObserver() {
  try {
    if ((window as any).__tldrThemeObserverInitialized) return;
    const obs = new MutationObserver(() => {
      document.querySelectorAll<HTMLImageElement>('.tldrwire-source img[data-tldr-host]').forEach((im) => applyThemeToFavicon(im));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    (window as any).__tldrThemeObserverInitialized = true;
  } catch {}
}

export function makeFaviconUrl(url: URL) {
  return `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
}

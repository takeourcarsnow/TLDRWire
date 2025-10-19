export function wrapImageInParagraph(img: HTMLImageElement) {
  const wrapper = document.createElement('p');
  wrapper.style.textAlign = 'center';
  wrapper.style.margin = '10px 0';
  wrapper.style.clear = 'both';
  img.parentNode?.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.margin = '0 auto';
  img.onerror = () => {
    try { wrapper.style.display = 'none'; } catch {}
  };
  img.onload = () => {
    // noop for now; left for debugging hooks
  };
}

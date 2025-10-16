import React, { useEffect, useRef } from 'react';
import { ApiResponse } from '../hooks/useApi';
import TwEmoji from './TwEmoji';
import { MapPin, Globe, Folder, PenTool, Clock, BarChart, Ruler } from 'lucide-react';

interface Props {
  data: ApiResponse | null;
}

export default function NewsMeta({ data }: Props) {
  if (!data?.meta) return null;

  const { containerRef } = useOverflowDetection();

  const sanitize = (s: any) => {
    try {
      return String(s || '').replace(/\uFFFD/g, '').trim();
    } catch (e) { return String(s || ''); }
  };

  const lang = sanitize(data.meta.language) || '';
  const items = [
    { icon: <MapPin size={14} />, label: 'Region', value: sanitize(data.meta.region) },
    { icon: <Globe size={14} />, label: 'Language', value: lang },
    { icon: <Folder size={14} />, label: 'Category', value: sanitize(data.meta.category) },
    { icon: <PenTool size={14} />, label: 'Style', value: sanitize(data.meta.style) },
    { icon: <Clock size={14} />, label: 'Window', value: `${sanitize(data.meta.timeframeHours)}h` },
    { icon: <BarChart size={14} />, label: 'Articles', value: sanitize(data.meta.usedArticles) },
    data.meta.length ? { icon: <Ruler size={14} />, label: 'Length', value: sanitize(data.meta.length) } : null,
    // model intentionally hidden from meta topbar
  ].filter(Boolean).filter(item => item!.value && item!.value.trim());

  if (items.length === 0) return null;

  return (
    <div className="meta">
      <div
        ref={containerRef}
        className={`meta-strip meta-scroll`}
        aria-hidden={false}
       >
        <div className="meta-strip-inner" role="list">
          {items.map((item, idx) => (
            <span key={idx} className="meta-item" role="listitem">
              {item!.icon} {item!.value}
            </span>
          ))}
          {/* duplicate content to allow seamless continuous scroll */}
          {items.map((item, idx) => (
            <span key={`dup-${idx}`} className="meta-item" aria-hidden="true">
              {item!.icon} {item!.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// add refs/state after component for readability
function useOverflowDetection() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let innerEl: HTMLElement | null = el.querySelector('.meta-strip-inner');

    const check = () => {
      // use rAF to ensure layout is stable
      requestAnimationFrame(() => {
        innerEl = el.querySelector('.meta-strip-inner');
        if (!innerEl) {
          el.style.removeProperty('--meta-marquee-duration');
          el.style.removeProperty('--meta-marquee-translate');
          return;
        }

        const innerW = innerEl.scrollWidth;
        const outerW = el.clientWidth;
        // Always enable scrolling for continuous marquee effect
        // Since content is duplicated, scrollWidth is 2x the width of one set
        const translate = innerW / 2; // px (width of one content set)
        const speed = 80; // px per second (tweakable)
        const duration = Math.max(4, translate / speed); // seconds, min 4s
        el.style.setProperty('--meta-marquee-duration', `${duration}s`);
        el.style.setProperty('--meta-marquee-translate', `${translate}px`);
      });
    };

    const ro = new ResizeObserver(check);
    // observe container and inner (if present). If inner changes, we'll re-query on next check.
    ro.observe(el);
    if (innerEl) ro.observe(innerEl);
    if (el.parentElement) ro.observe(el.parentElement);

    window.addEventListener('resize', check);
    // MutationObserver to detect when inner gets added/removed (so we can re-run check)
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: false });

    check();

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);

  return { containerRef } as const;
}

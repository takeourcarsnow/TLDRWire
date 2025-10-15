import React, { useEffect, useState, useRef } from 'react';

type Entry = {
  id: string;
  selector: string;
  count: number;
  heights: number[];
  minHeights: string[];
};

const DEFAULT_SELECTORS = [
  'main',
  '.panel',
  '.panel:first-child',
  '.output',
  '.history-list-container',
  '.history-grid',
  '.preset-carousel',
  'footer',
];

export default function LayoutDebugger() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [visible, setVisible] = useState<boolean>(true);
  const [outlines, setOutlines] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const collect = () => {
      try {
        const next: Entry[] = DEFAULT_SELECTORS.map((sel) => {
          const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
          const heights = nodes.map((n) => Math.round(n.getBoundingClientRect().height));
          const minHeights = nodes.map((n) => {
            try {
              return window.getComputedStyle(n).getPropertyValue('min-height') || '';
            } catch (e) {
              return '';
            }
          });
          return {
            id: sel,
            selector: sel,
            count: nodes.length,
            heights,
            minHeights,
          };
        });
        setEntries(next);
      } catch (err) {
        // ignore
      }
    };

    collect();
    const onResize = () => collect();
    window.addEventListener('resize', onResize);

    // Poll because some content loads after mount (hydration, dynamic import)
    intervalRef.current = window.setInterval(collect, 1200);

    return () => {
      window.removeEventListener('resize', onResize);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Toggle outlines by injecting a data attribute class
    if (typeof window === 'undefined') return;
    try {
      if (outlines) {
        DEFAULT_SELECTORS.forEach((sel, idx) => {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            el.dataset.layoutDebug = String(idx);
            el.style.outline = '2px dashed rgba(255,165,0,0.9)';
            el.style.outlineOffset = '2px';
          });
        });
      } else {
        DEFAULT_SELECTORS.forEach((sel) => {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            if (el.dataset.layoutDebug !== undefined) delete el.dataset.layoutDebug;
            el.style.outline = '';
            el.style.outlineOffset = '';
          });
        });
      }
    } catch (e) {}
  }, [outlines]);

  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return null;

  return (
    <div aria-hidden={!visible} style={{ position: 'fixed', right: 12, top: 12, zIndex: 99999, fontFamily: 'system-ui,Segoe UI,Roboto,Arial', fontSize: 12 }}>
      <div style={{ background: 'rgba(10,11,14,0.85)', color: 'white', padding: 8, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.5)', maxWidth: 360 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>Layout Debugger</strong>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => setOutlines((s) => !s)} style={{ background: outlines ? '#ffb366' : 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#000', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }} title="Toggle outlines">Outline</button>
            <button onClick={() => setVisible(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }} title="Hide debugger">Hide</button>
          </div>
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 6px', opacity: 0.9 }}>Selector</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', opacity: 0.9 }}>Count</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', opacity: 0.9 }}>Heights</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', opacity: 0.9 }}>min-height(s)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.selector} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px' }}>{e.selector}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{e.count}</td>
                  <td style={{ padding: '6px', textAlign: 'right', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.heights.length ? e.heights.join(', ') : '-'}</td>
                  <td style={{ padding: '6px', textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.minHeights.length ? e.minHeights.join(', ') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button onClick={() => {
            // Force a collect by dispatching resize
            try { window.dispatchEvent(new Event('resize')); } catch (e) {}
          }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Refresh</button>
          <button onClick={() => {
            // Log a detailed snapshot to console for easier debugging
            try {
              const snapshot = entries.reduce((acc: any, cur) => { acc[cur.selector] = { count: cur.count, heights: cur.heights, minHeights: cur.minHeights }; return acc; }, {});
              console.group('Layout Debugger Snapshot');
              console.table(snapshot);

              // Verbose per-node info: bounding rects and computed styles for each matching element
              DEFAULT_SELECTORS.forEach((sel) => {
                try {
                  const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
                  if (!nodes.length) return;
                  console.group(`Selector: ${sel} (${nodes.length})`);
                  nodes.forEach((n, i) => {
                    const r = n.getBoundingClientRect();
                    const cs = window.getComputedStyle(n);
                    const info = {
                      index: i,
                      tag: n.tagName.toLowerCase(),
                      id: n.id || null,
                      class: n.className || null,
                      rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
                      offsetHeight: n.offsetHeight,
                      clientHeight: n.clientHeight,
                      scrollHeight: n.scrollHeight,
                      computedMinHeight: cs.getPropertyValue('min-height'),
                      computedHeight: cs.getPropertyValue('height'),
                      marginTop: cs.getPropertyValue('margin-top'),
                      marginBottom: cs.getPropertyValue('margin-bottom'),
                      paddingTop: cs.getPropertyValue('padding-top'),
                      paddingBottom: cs.getPropertyValue('padding-bottom'),
                      innerTextLength: (n.innerText || '').length,
                      htmlSnippet: (n.innerHTML || '').slice(0, 200)
                    };
                    console.log(info, n);
                  });
                  console.groupEnd();
                } catch (e) { console.warn('Error logging selector', sel, e); }
              });

              console.groupEnd();
            } catch (e) { console.warn(e); }
          }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Log</button>
          <button onClick={() => {
            // Reset possible outlines/styles inserted by the debugger
            setOutlines(false);
            DEFAULT_SELECTORS.forEach((sel) => document.querySelectorAll<HTMLElement>(sel).forEach((el) => { el.style.outline = ''; el.style.outlineOffset = ''; if (el.dataset.layoutDebug !== undefined) delete el.dataset.layoutDebug; }));
          }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Reset</button>
        </div>
      </div>
      {!visible && (
        <button onClick={() => setVisible(true)} style={{ marginTop: 8, padding: '6px 8px', borderRadius: 8, background: 'rgba(10,11,14,0.85)', color: 'white', border: '1px solid rgba(255,255,255,0.06)' }}>Show Layout Debugger</button>
      )}
    </div>
  );
}

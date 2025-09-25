import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HistoryEntry } from '../hooks/useApi';

interface Props {
  history: HistoryEntry[];
  onApply: (payload: any) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  onView: (entry: HistoryEntry) => void;
}

function HistorySnippet({ markdown }: { markdown: string }) {
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

  return <div ref={ref} className="muted" style={{ maxHeight: '3.6em', overflow: 'hidden', textOverflow: 'ellipsis' }} />;
}

export function HistoryList({ history, onApply, onDelete, onClear, onView }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return history;
    return history.filter(h => {
      return (
        (h.payload.region || '').toLowerCase().includes(term) ||
        (h.payload.category || '').toLowerCase().includes(term) ||
        (h.payload.style || '').toLowerCase().includes(term) ||
        (h.summarySnippet || '').toLowerCase().includes(term)
      );
    });
  }, [history, q]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search history (region, category, style, text)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: 'var(--panel-bg)' }}
        />
      </div>

      {filtered.length === 0 && <div className="muted">No matching history. Generate a TLDR to save an entry.</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '52vh', overflowY: 'auto', paddingRight: 8 }}>
        {filtered.map((h) => (
          <li key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{new Date(h.timestamp).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>{h.payload.region}</span>
                    <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>{h.payload.category}</span>
                    <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>{h.payload.style}</span>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <HistorySnippet markdown={h.summarySnippet || ''} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                <button className="secondary" style={{ padding: '8px 10px' }} onClick={() => onApply(h.payload)}>Apply</button>
                <button className="secondary" style={{ padding: '8px 10px' }} onClick={() => onView(h)}>View</button>
                <button className="danger" style={{ padding: '8px 10px' }} onClick={() => onDelete(h.id)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HistoryList;

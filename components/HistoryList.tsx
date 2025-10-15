import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Check, Eye, Trash2, Search } from 'lucide-react';
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

  return <div ref={ref} className="history-snippet" />;
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
    <div className="history-list-container">
      <div className="history-search-wrapper">
        <div className="history-search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search history (region, category, style, text)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="history-search-input"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="history-empty-state">
          <div className="empty-icon">📝</div>
          <h3>No matching history</h3>
          <p>Generate a TLDR to save an entry.</p>
        </div>
      )}

      <div className="history-grid">
        {filtered.map((h) => (
          <div key={h.id} className="history-card">
            <div className="history-card-header">
              <div className="history-timestamp">
                {new Date(h.timestamp).toLocaleDateString()} at {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="history-tags">
                <span className="history-tag region-tag">{h.payload.region}</span>
                <span className="history-tag category-tag">{h.payload.category}</span>
                <span className="history-tag style-tag">{h.payload.style}</span>
              </div>
            </div>

            <div className="history-content">
              <HistorySnippet markdown={h.summarySnippet || ''} />
            </div>

            <div className="history-actions">
              <button
                className="history-action-btn apply-btn"
                onClick={() => onApply(h.payload)}
                title="Apply settings"
              >
                <Check size={16} />
                <span>Apply</span>
              </button>
              <button
                className="history-action-btn view-btn"
                onClick={() => onView(h)}
                title="View full summary"
              >
                <Eye size={16} />
                <span>View</span>
              </button>
              <button
                className="history-action-btn delete-btn"
                onClick={() => onDelete(h.id)}
                title="Delete"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryList;

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { HistoryListProps } from '../types/history';
import HistorySearch from './HistorySearch';
import HistoryEmptyState from './HistoryEmptyState';
import HistoryCard from './HistoryCard';

export function HistoryList({ history, onApply, onDelete, onClear, renderMarkdownToElement }: HistoryListProps) {
  const [q, setQ] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  // Notify the surrounding swipeable container when the visible content
  // changes (filtering, expansion) so the Swiper can recalculate its
  // auto-height. We use a lightweight custom event so we don't need to
  // thread Swiper refs through many components.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Defer to the next animation frame so DOM updates have settled
    // and measurements will be accurate when Swiper recalculates.
    const raf = window.requestAnimationFrame(() => {
      try {
        window.dispatchEvent(new Event('tldrwire:history-updated'));
      } catch (_) {
        // ignore (defensive)
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [q, filtered.length, expandedId]);

  return (
    <div className="history-list-container">
      <HistorySearch query={q} onQueryChange={setQ} />

      {filtered.length === 0 && <HistoryEmptyState />}

      <div className="history-grid">
        {filtered.map((h) => (
          <HistoryCard
            key={h.id}
            entry={h}
            isExpanded={expandedId === h.id}
            onToggleExpand={() => {
              if (expandedId === h.id) {
                setExpandedId(null);
              } else {
                setExpandedId(h.id);
              }
            }}
            onApply={onApply}
            onDelete={onDelete}
            renderMarkdownToElement={renderMarkdownToElement}
          />
        ))}
      </div>
    </div>
  );
}

export default HistoryList;

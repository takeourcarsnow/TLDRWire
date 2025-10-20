import React, { useRef, useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp, Trash2, MapPin, Folder, PenTool } from 'lucide-react';
import { HistoryEntry } from '../hooks/useApi';
import { formatTimeAgo } from '../utils/historyUtils';
import HistorySnippet from './HistorySnippet';

interface HistoryCardProps {
  entry: HistoryEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApply: (payload: any) => void;
  onDelete: (id: number) => void;
  renderMarkdownToElement: (el: HTMLDivElement | null, markdown: string | undefined) => void;
}

function HistoryCard({
  entry,
  isExpanded,
  onToggleExpand,
  onApply,
  onDelete,
  renderMarkdownToElement
}: HistoryCardProps) {
  const [expandedTimestamps, setExpandedTimestamps] = useState<Set<number>>(new Set());
  const expandedRef = useRef<HTMLDivElement | null>(null);

  // Handle timestamp expansion
  const handleTimestampClick = () => {
    const newExpanded = new Set(expandedTimestamps);
    if (newExpanded.has(entry.id)) {
      newExpanded.delete(entry.id);
    } else {
      newExpanded.add(entry.id);
    }
    setExpandedTimestamps(newExpanded);
  };

  // Render full content when expanded
  React.useEffect(() => {
    if (isExpanded && expandedRef.current) {
      const md = entry.summaryFull || entry.summarySnippet || '';
      renderMarkdownToElement(expandedRef.current, md);
    }
  }, [isExpanded, entry, renderMarkdownToElement]);

  return (
    <div className={`history-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="history-card-header">
        <div
          className="history-timestamp"
          onClick={handleTimestampClick}
          style={{ cursor: 'pointer' }}
          title="Click to toggle date format"
        >
          {expandedTimestamps.has(entry.id)
            ? `${new Date(entry.timestamp).toLocaleDateString()} at ${new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : formatTimeAgo(entry.timestamp)
          }
        </div>
        <div className="history-tags">
          <span className="history-tag region-tag" title={`Region: ${entry.payload.region}`}>
            <MapPin size={14} /> {entry.payload.region}
          </span>
          <span className="history-tag category-tag" title={`Category: ${entry.payload.category}`}>
            <Folder size={14} /> {entry.payload.category}
          </span>
          <span className="history-tag style-tag" title={`Style: ${entry.payload.style}`}>
            <PenTool size={14} /> {entry.payload.style}
          </span>
        </div>
      </div>

      <div className="history-content">
        {isExpanded ? (
          <div
            ref={expandedRef}
            className="history-full summary"
            aria-label="Full saved summary"
          />
        ) : (
          <HistorySnippet markdown={entry.summarySnippet || ''} />
        )}
      </div>

      <div className="history-actions">
        <button
          className="history-action-btn apply-btn"
          onClick={() => onApply(entry.payload)}
          title="Retry with these settings"
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="history-action-btn view-btn"
          onClick={onToggleExpand}
          title={isExpanded ? "Collapse summary" : "Expand summary"}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          className="history-action-btn delete-btn"
          onClick={() => onDelete(entry.id)}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default HistoryCard;
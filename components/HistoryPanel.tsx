import React, { useState, useRef } from 'react';
import { Check, Trash2 } from 'lucide-react';
import HistoryList from './HistoryList';
import { Modal } from './Modal';
import { Preferences } from '../hooks/usePreferences';

interface HistoryPanelProps {
  history: any[];
  onApply: (payload: any) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  updatePreference: (key: keyof Preferences, value: string) => void;
  renderMarkdownToElement: (el: HTMLDivElement | null, markdown: string | undefined) => void;
}

export function HistoryPanel({
  history,
  onApply,
  onDelete,
  onClear,
  updatePreference,
  renderMarkdownToElement
}: HistoryPanelProps) {
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selectedHistoryEntry) {
      const md = selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '';
      renderMarkdownToElement(selectedSummaryRef.current, md);
    }
  }, [selectedHistoryEntry, renderMarkdownToElement]);

  return (
    <div className="history-panel">
      <div className="panel-header">
        <h2>Generation History</h2>
        <button className="secondary icon-button" onClick={onClear} title="Clear all">
          <Trash2 size={16} />
        </button>
      </div>
      <HistoryList
        history={history}
        onApply={(payload) => {
          Object.entries(payload).forEach(([key, value]) => {
            updatePreference(key as keyof Preferences, String(value));
          });
        }}
        onDelete={onDelete}
        onClear={onClear}
        onView={(entry) => setSelectedHistoryEntry(entry)}
      />

      <Modal
        isOpen={Boolean(selectedHistoryEntry)}
        onClose={() => setSelectedHistoryEntry(null)}
        title={selectedHistoryEntry ? `Generated ${new Date(selectedHistoryEntry.timestamp).toLocaleString()}` : 'Entry'}
      >
        {selectedHistoryEntry && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>Settings:</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                {selectedHistoryEntry.payload.region} • {selectedHistoryEntry.payload.category} • {selectedHistoryEntry.payload.style} • {selectedHistoryEntry.payload.length}
              </div>
            </div>

            <article
              ref={selectedSummaryRef}
              className="summary"
              aria-label="Saved summary"
              style={{
                marginBottom: 12,
                width: 'min(680px, 78vw)',
                maxHeight: '68vh',
                overflowY: 'auto',
                paddingRight: 8
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary icon-button" onClick={() => {
                Object.entries(selectedHistoryEntry.payload).forEach(([key, value]) => {
                  updatePreference(key as keyof Preferences, String(value));
                });
                setSelectedHistoryEntry(null);
              }} title="Apply settings">
                <Check size={14} />
              </button>
              <button className="secondary" onClick={() => {
                navigator.clipboard?.writeText(selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '');
              }}>Copy summary</button>
              <button className="danger icon-button" onClick={() => {
                onDelete(selectedHistoryEntry.id);
                setSelectedHistoryEntry(null);
              }} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
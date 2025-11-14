import React, { useRef } from 'react';
import { Modal } from './Modal';
import { usePreferences, type Preferences } from '../hooks/usePreferences';

interface HomeModalProps {
  selectedHistoryEntry: any;
  setSelectedHistoryEntry: (entry: any) => void;
  onApplyHistory: (payload: any) => void;
  onDeleteHistory: (id: number) => void;
  updatePreference: (key: keyof Preferences, value: string) => void;
  setActiveTab: (tab: number) => void;
}

export function HomeModal({
  selectedHistoryEntry,
  setSelectedHistoryEntry,
  onApplyHistory,
  onDeleteHistory,
  updatePreference,
  setActiveTab
}: HomeModalProps) {
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
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
                // Make modal content match main output width and allow internal scrolling
                width: 'min(680px, 78vw)',
                maxHeight: '68vh',
                overflowY: 'auto',
                paddingRight: 8
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={() => {
                // apply settings
                Object.entries(selectedHistoryEntry.payload).forEach(([key, value]) => {
                  updatePreference(key as keyof Preferences, String(value));
                });
                setSelectedHistoryEntry(null);
                setActiveTab(0); // Switch to home tab
              }}>Apply settings</button>
              <button className="secondary" onClick={() => {
                navigator.clipboard?.writeText(selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '');
              }}>Copy summary</button>
              <button className="danger" onClick={() => {
                onDeleteHistory(selectedHistoryEntry.id);
                setSelectedHistoryEntry(null);
              }}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Render sanitized HTML for selected history entry so links and favicons behave like the main output */}
      <script
        dangerouslySetInnerHTML={{ __html: '' }}
      />
    </>
  );
}
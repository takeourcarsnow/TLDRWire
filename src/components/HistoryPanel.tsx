import React, { memo } from 'react';
import HistoryList from './HistoryList';
import { Preferences } from '../hooks/usePreferences';

interface HistoryPanelProps {
  history: any[];
  onApply: (payload: any) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  updatePreference: (key: keyof Preferences, value: string) => void;
  renderMarkdownToElement: (el: HTMLDivElement | null, markdown: string | undefined) => void;
}

export const HistoryPanel = memo(function HistoryPanel({
  history,
  onApply,
  onDelete,
  onClear,
  updatePreference,
  renderMarkdownToElement
}: HistoryPanelProps) {
  return (
    <div className="history-panel">
      <HistoryList
        history={history}
        onApply={(payload) => {
          Object.entries(payload).forEach(([key, value]) => {
            updatePreference(key as keyof Preferences, String(value));
          });
        }}
        onDelete={onDelete}
        onClear={onClear}
        renderMarkdownToElement={renderMarkdownToElement}
      />
    </div>
  );
});
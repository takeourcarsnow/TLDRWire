import React from 'react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  compactMode: boolean;
  onCompactModeChange: (compact: boolean) => void;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

export default function NewsFormDisplay({ preferences, compactMode, onCompactModeChange, onPreferenceChange }: Props) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="compactToggle">🧩 Display</label>
        <div className="row">
          <div>
            <label
              htmlFor="compactToggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                userSelect: 'none',
                cursor: 'pointer'
              }}
            >
              <input
                id="compactToggle"
                type="checkbox"
                checked={compactMode}
                onChange={(e) => onCompactModeChange(e.target.checked)}
              />
              🗜️ Compact reading mode
            </label>
          </div>
          <div>
            <label htmlFor="query">🔍 Keyword Filter (Optional)</label>
            <input
              id="query"
              type="text"
              placeholder="e.g. climate change, AI breakthrough, sports championship"
              value={preferences.query}
              onChange={(e) => onPreferenceChange('query', e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

import React from 'react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

export default function NewsFormDisplay({ preferences, onPreferenceChange }: Props) {
  return (
    <>
      <div className="form-group">
        <div style={{ display: 'grid', gap: 8 }}>
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
    </>
  );
}

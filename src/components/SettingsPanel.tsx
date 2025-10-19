import React from 'react';
import { Preferences } from '../hooks/usePreferences';
import NewsFormSelectors from './NewsFormSelectors';
import NewsFormSliders from './NewsFormSliders';

interface SettingsPanelProps {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onReset: () => void;
}

export function SettingsPanel({
  preferences,
  onPreferenceChange,
  onReset
}: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <h3>Default Preferences</h3>
        <NewsFormSelectors preferences={preferences} onPreferenceChange={onPreferenceChange} />
        <NewsFormSliders preferences={preferences} onPreferenceChange={onPreferenceChange} />
        <div style={{ marginTop: 16 }}>
          <button className="secondary" onClick={onReset}>Reset to Defaults</button>
        </div>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <p>
          TLDRWire delivers quick, readable summaries of today&apos;s headlines from multiple publishers so you can stay informed fast. Choose region, topic, and length to get briefings tailored to what matters to you.
        </p>
        {/* Attribution removed per user request */}
      </div>
    </div>
  );
}
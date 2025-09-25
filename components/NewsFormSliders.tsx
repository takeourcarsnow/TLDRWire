import React from 'react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const LENGTH_OPTIONS = ['short', 'medium', 'long', 'very-long'];

export default function NewsFormSliders({ preferences, onPreferenceChange, fontSize, onFontSizeChange }: Props) {
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < 1) value = 1;
    if (value > 72) value = 72;
    onPreferenceChange('timeframe', value.toString());
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < 8) value = 8;
    if (value > 40) value = 40;
    onPreferenceChange('limit', value.toString());
  };

  const handleLengthSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const clamped = Math.min(Math.max(idx, 0), LENGTH_OPTIONS.length - 1);
    onPreferenceChange('length', LENGTH_OPTIONS[clamped]);
  };

  const lengthIndex = (len: string) => {
    const idx = LENGTH_OPTIONS.indexOf(len);
    return idx >= 0 ? idx : 1;
  };

  return (
    <div className="form-group">
      <div className="slider-row">
        <div className="slider-group">
          <label htmlFor="timeframe" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.1em' }}>⏰</span> Timeframe (hours)
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <input
              aria-label="Timeframe hours slider"
              type="range"
              min={1}
              max={72}
              value={Number(preferences.timeframe)}
              onChange={handleTimeframeChange}
              style={{ flex: 1 }}
            />
            <div className="muted" style={{ minWidth: 40, textAlign: 'right' }}>{preferences.timeframe}</div>
          </div>
        </div>
        <div className="slider-group">
          <label htmlFor="limit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.1em' }}>📊</span> Articles to Consider
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <input
              aria-label="Articles to consider slider"
              type="range"
              min={8}
              max={40}
              value={Number(preferences.limit)}
              onChange={handleLimitChange}
              style={{ flex: 1 }}
            />
            <div className="muted" style={{ minWidth: 40, textAlign: 'right' }}>{preferences.limit}</div>
          </div>
        </div>
        <div className="slider-group">
          <label htmlFor="length" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.1em' }}>📏</span> TLDR Length
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <input
              aria-label="TLDR length slider"
              type="range"
              min={0}
              max={LENGTH_OPTIONS.length - 1}
              step={1}
              value={lengthIndex(preferences.length)}
              onChange={handleLengthSliderChange}
              style={{ flex: 1 }}
            />
            <div className="muted" style={{ minWidth: 80, textAlign: 'right' }}>{preferences.length.replace('-', ' ')}</div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="fontSize">📏 Font size</label>
          <input
            id="fontSize"
            type="range"
            min={12}
            max={20}
            step={1}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            aria-label="Summary font size"
          />
          <div className="muted" style={{ fontSize: '0.9rem' }}>{fontSize}px</div>
        </div>
      </div>
    </div>
  );
}

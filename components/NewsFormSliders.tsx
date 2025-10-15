import React from 'react';
import { Ruler, Clock, BarChart } from 'lucide-react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

const LENGTH_OPTIONS = ['short', 'medium', 'long', 'very-long'];

export default function NewsFormSliders({ preferences, onPreferenceChange }: Props) {
  const [dragging, setDragging] = React.useState<{timeframe?: boolean, limit?: boolean, length?: boolean}>({});

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

  const handlePointerDown = (slider: keyof typeof dragging) => {
    setDragging(prev => ({ ...prev, [slider]: true }));
  };

  const handlePointerUp = (slider: keyof typeof dragging) => {
    setDragging(prev => ({ ...prev, [slider]: false }));
  };

  // Handle pointer up events globally to ensure dragging state is reset
  React.useEffect(() => {
    const handleGlobalPointerUp = () => {
      setDragging({});
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  return (
    <div className="form-group">
      <div className="slider-row">
        <div className="slider-group">
          <label htmlFor="timeframe" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={18} /> Timeframe (hours)
          </label>
          <div className="slider-container" style={{ marginTop: 4, position: 'relative' }}>
            <input
              aria-label="Timeframe hours slider"
              type="range"
              min={1}
              max={72}
              value={Number(preferences.timeframe)}
              onChange={handleTimeframeChange}
              onPointerDown={() => handlePointerDown('timeframe')}
              onPointerUp={() => handlePointerUp('timeframe')}
              style={{ width: '100%' }}
            />
            {dragging.timeframe && (
              <div 
                className="slider-value" 
                style={{
                  position: 'absolute',
                  left: `${((Number(preferences.timeframe) - 1) / (72 - 1)) * 100}%`,
                  top: '-24px',
                  transform: 'translateX(-50%)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px var(--shadow)'
                }}
              >
                {preferences.timeframe}
              </div>
            )}
          </div>
        </div>
        <div className="slider-group">
          <label htmlFor="limit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart size={18} /> Articles to Consider
          </label>
          <div className="slider-container" style={{ marginTop: 4, position: 'relative' }}>
            <input
              aria-label="Articles to consider slider"
              type="range"
              min={8}
              max={40}
              value={Number(preferences.limit)}
              onChange={handleLimitChange}
              onPointerDown={() => handlePointerDown('limit')}
              onPointerUp={() => handlePointerUp('limit')}
              style={{ width: '100%' }}
            />
            {dragging.limit && (
              <div 
                className="slider-value" 
                style={{
                  position: 'absolute',
                  left: `${((Number(preferences.limit) - 8) / (40 - 8)) * 100}%`,
                  top: '-24px',
                  transform: 'translateX(-50%)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px var(--shadow)'
                }}
              >
                {preferences.limit}
              </div>
            )}
          </div>
        </div>
        <div className="slider-group">
          <label htmlFor="length" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ruler size={18} /> TLDR Length
          </label>
          <div className="slider-container" style={{ marginTop: 4, position: 'relative' }}>
            <input
              aria-label="TLDR length slider"
              type="range"
              min={0}
              max={LENGTH_OPTIONS.length - 1}
              step={1}
              value={lengthIndex(preferences.length)}
              onChange={handleLengthSliderChange}
              onPointerDown={() => handlePointerDown('length')}
              onPointerUp={() => handlePointerUp('length')}
              style={{ width: '100%' }}
            />
            {dragging.length && (
              <div 
                className="slider-value" 
                style={{
                  position: 'absolute',
                  left: `${(lengthIndex(preferences.length) / (LENGTH_OPTIONS.length - 1)) * 100}%`,
                  top: '-24px',
                  transform: 'translateX(-50%)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px var(--shadow)'
                }}
              >
                {preferences.length.replace('-', ' ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Ruler, Clock, BarChart } from 'lucide-react';
import { Preferences } from '../hooks/usePreferences';
import { LENGTH_OPTIONS, TIMEFRAME_MIN, TIMEFRAME_MAX, ARTICLES_MIN, ARTICLES_MAX } from '../constants/ui';
import { SliderValue } from './SliderValue';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onSliderDrag?: (isDragging: boolean) => void;
}

export default function NewsFormSliders({ preferences, onPreferenceChange, onSliderDrag }: Props) {
  const [dragging, setDragging] = React.useState<{timeframe?: boolean, limit?: boolean, length?: boolean}>({});

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < TIMEFRAME_MIN) value = TIMEFRAME_MIN;
    if (value > TIMEFRAME_MAX) value = TIMEFRAME_MAX;
    onPreferenceChange('timeframe', value.toString());
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < ARTICLES_MIN) value = ARTICLES_MIN;
    if (value > ARTICLES_MAX) value = ARTICLES_MAX;
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
    onSliderDrag?.(true);
  };

  const handlePointerUp = (slider: keyof typeof dragging) => {
    setDragging(prev => ({ ...prev, [slider]: false }));
    // Check if any slider is still being dragged
    const newDragging = { ...dragging };
    delete newDragging[slider];
    const stillDragging = Object.values(newDragging).some(isDragging => isDragging);
    if (!stillDragging) {
      onSliderDrag?.(false);
    }
  };

  // Handle pointer up events globally to ensure dragging state is reset
  React.useEffect(() => {
    const handleGlobalPointerUp = () => {
      setDragging({});
      onSliderDrag?.(false);
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [onSliderDrag]);

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
              min={TIMEFRAME_MIN}
              max={TIMEFRAME_MAX}
              value={Number(preferences.timeframe)}
              onChange={handleTimeframeChange}
              onPointerDown={() => handlePointerDown('timeframe')}
              onPointerUp={() => handlePointerUp('timeframe')}
              style={{ width: '100%' }}
            />
            <SliderValue
              value={preferences.timeframe}
              min={TIMEFRAME_MIN}
              max={TIMEFRAME_MAX}
              dragging={dragging.timeframe || false}
            />
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
              min={ARTICLES_MIN}
              max={ARTICLES_MAX}
              value={Number(preferences.limit)}
              onChange={handleLimitChange}
              onPointerDown={() => handlePointerDown('limit')}
              onPointerUp={() => handlePointerUp('limit')}
              style={{ width: '100%' }}
            />
            <SliderValue
              value={preferences.limit}
              min={ARTICLES_MIN}
              max={ARTICLES_MAX}
              dragging={dragging.limit || false}
            />
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
            <SliderValue
              value={lengthIndex(preferences.length)}
              min={0}
              max={LENGTH_OPTIONS.length - 1}
              dragging={dragging.length || false}
              displayValue={preferences.length.replace('-', ' ')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

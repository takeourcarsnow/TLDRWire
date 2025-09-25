import React from 'react';
import { Preferences } from '../hooks/usePreferences';
import NewsFormSelectors from './NewsFormSelectors';
import NewsFormSliders from './NewsFormSliders';
import NewsFormDisplay from './NewsFormDisplay';
import NewsFormActions from './NewsFormActions';

interface NewsFormProps {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
  compactMode: boolean;
  onCompactModeChange: (compact: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export function NewsForm(props: NewsFormProps) {
  return (
    <>
      <NewsFormSelectors preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormSliders preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} fontSize={props.fontSize} onFontSizeChange={props.onFontSizeChange} />
      <NewsFormDisplay preferences={props.preferences} compactMode={props.compactMode} onCompactModeChange={props.onCompactModeChange} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormActions onGenerate={props.onGenerate} onReset={props.onReset} onPresetClick={props.onPresetClick} isLoading={props.isLoading} rateLimited={props.rateLimited} rateLimitCountdown={props.rateLimitCountdown} />
    </>
  );
}
import React from 'react';
import { Preferences } from '../hooks/usePreferences';
import NewsFormSelectors from './NewsFormSelectors';
import NewsFormSliders from './NewsFormSliders';
import NewsFormDisplay from './NewsFormDisplay';
import NewsFormActions from './NewsFormActions';

interface NewsFormProps {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onGenerate: () => Promise<void>;
  onReset: () => void;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export function NewsForm(props: NewsFormProps) {
  return (
    <>
      <NewsFormSelectors preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormSliders preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} fontSize={props.fontSize} onFontSizeChange={props.onFontSizeChange} />
  <NewsFormDisplay preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormActions onGenerate={props.onGenerate} onReset={props.onReset} onPresetClick={props.onPresetClick} isLoading={props.isLoading} rateLimited={props.rateLimited} rateLimitCountdown={props.rateLimitCountdown} />
    </>
  );
}
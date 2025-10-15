import React from 'react';
import { Preferences } from '../hooks/usePreferences';
import NewsFormSelectors from './NewsFormSelectors';
import NewsFormSliders from './NewsFormSliders';
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
}

export function NewsForm(props: NewsFormProps) {
  return (
    <>
      <NewsFormSelectors preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormSliders preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <NewsFormActions onGenerate={props.onGenerate} onReset={props.onReset} onPresetClick={props.onPresetClick} isLoading={props.isLoading} rateLimited={props.rateLimited} rateLimitCountdown={props.rateLimitCountdown} />
    </>
  );
}
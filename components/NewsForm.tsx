import React from 'react';
import { Preferences } from '../hooks/usePreferences';
import NewsFormSelectors from './NewsFormSelectors';
import NewsFormSliders from './NewsFormSliders';
import NewsFormActions from './NewsFormActions';

interface NewsFormProps {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onGenerate: () => Promise<void>;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
  selectedPreset?: string | null;
  onSliderDrag?: (isDragging: boolean) => void;
}

export const NewsForm = React.memo(function NewsForm(props: NewsFormProps) {
  return (
    <>
      <NewsFormSelectors preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} />
      <div className="form-divider"></div>
      <NewsFormSliders preferences={props.preferences} onPreferenceChange={props.onPreferenceChange} onSliderDrag={props.onSliderDrag} />
      <div className="form-divider"></div>
      <NewsFormActions onGenerate={props.onGenerate} onPresetClick={props.onPresetClick} isLoading={props.isLoading} rateLimited={props.rateLimited} rateLimitCountdown={props.rateLimitCountdown} />
    </>
  );
});
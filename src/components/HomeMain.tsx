import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { renderMarkdownToElement } from '../utils/rendering';
import { usePreferences, type Preferences } from '../hooks/usePreferences';
import { PRESET_CONFIGS } from '../constants/ui';

const SwipeableContainer = dynamic(() => import('./SwipeableContainer').then(m => ({ default: m.SwipeableContainer })), { ssr: false });
const BottomNavbar = dynamic(() => import('./BottomNavbar').then(m => ({ default: m.BottomNavbar })), { ssr: false });
const NewsForm = dynamic(() => import('./NewsForm').then(m => ({ default: m.NewsForm })), { ssr: false });
const NewsOutput = dynamic(() => import('./NewsOutput').then(m => ({ default: m.NewsOutput })), { ssr: false });
const HistoryPanel = dynamic(() => import('./HistoryPanel').then(m => ({ default: m.HistoryPanel })), { ssr: false });
const PresetCarousel = dynamic(() => import('./PresetCarousel').then(m => m.default), { ssr: false });

interface HomeMainProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  isLoading: boolean;
  error: any;
  data: any;
  lastRequestRef: React.MutableRefObject<any>;
  history: any[];
  onApplyHistory: (payload: any) => void;
  onDeleteHistory: (id: number) => void;
  onClearHistory: () => void;
  preferences: Preferences;
  updatePreference: (key: keyof Preferences, value: string) => void;
  onGenerate: () => Promise<void>;
  onPresetClick: (preset: string) => void;
  selectedPreset: string | null;
  rateLimited: boolean;
  rateLimitCountdown: number;
  isDraggingSlider: boolean;
  setIsDraggingSlider: (dragging: boolean) => void;
}

export function HomeMain({
  activeTab,
  setActiveTab,
  isLoading,
  error,
  data,
  lastRequestRef,
  history,
  onApplyHistory,
  onDeleteHistory,
  onClearHistory,
  preferences,
  updatePreference,
  onGenerate,
  onPresetClick,
  selectedPreset,
  rateLimited,
  rateLimitCountdown,
  isDraggingSlider,
  setIsDraggingSlider
}: HomeMainProps) {
  // Memoized reference to the shared markdown renderer so history and output look identical
  const renderMarkdownToElementMemo = useMemo(() => renderMarkdownToElement, []);

  return (
    <>
      <main className={isLoading ? 'blurred' : ''} id="main-content">
        <SwipeableContainer activeIndex={activeTab} onSlideChange={setActiveTab} disabled={isDraggingSlider}>
          <section className="panel">
            <h2 style={{ margin: 0, flexShrink: 0, fontSize: '18px', fontWeight: 'normal', color: 'var(--text)' }}>Presets</h2>
            <PresetCarousel onPresetClick={onPresetClick} selectedPreset={selectedPreset} />
            <div className="form-divider"></div>
            <NewsForm
              preferences={preferences}
              onPreferenceChange={updatePreference}
              onGenerate={onGenerate}
              onPresetClick={onPresetClick}
              selectedPreset={selectedPreset}
              isLoading={isLoading}
              rateLimited={rateLimited}
              rateLimitCountdown={rateLimitCountdown}
              onSliderDrag={setIsDraggingSlider}
            />
          </section>

          <section className="panel output">
            <NewsOutput
              isLoading={isLoading}
              error={error}
              data={data}
              lastRequest={lastRequestRef.current}
              onHistory={() => setActiveTab(2)} // Switch to history tab
            />
          </section>

          <HistoryPanel
            history={history}
            onApply={onApplyHistory}
            onDelete={onDeleteHistory}
            onClear={onClearHistory}
            updatePreference={updatePreference}
            renderMarkdownToElement={renderMarkdownToElementMemo}
          />
        </SwipeableContainer>
      </main>

      <BottomNavbar activeIndex={activeTab} onTabChange={setActiveTab} />
    </>
  );
}
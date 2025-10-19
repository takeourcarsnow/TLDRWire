import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useTheme } from '../hooks/useTheme';
import { usePreferences, type Preferences } from '../hooks/usePreferences';
import { useApi } from '../hooks/useApi';
import { usePerformanceMonitoring } from '../hooks/usePerformance';
import { useRateLimit } from '../hooks/useRateLimit';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useKeyboardShortcuts } from '../utils/keyboardShortcuts';
import { HomeHeader } from '../components/HomeHeader';
import { HomeMain } from '../components/HomeMain';
import { HomeModal } from '../components/HomeModal';
import { PRESET_CONFIGS } from '../constants/ui';
import { detectLanguage, detectRegionFromLanguage } from '../utils/language';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError, history, clearHistory, removeHistoryItem } = useApi();
  usePerformanceMonitoring();
  useServiceWorker();
  useHealthCheck();

  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const lastRequestRef = useRef<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const { lastGenerateTime, rateLimitCountdown, startRateLimit, isRateLimited } = useRateLimit();

  useEffect(() => {
    if (data && !isLoading) {
      setActiveTab(1);
    }
  }, [data, isLoading]);

  const generateSummary = useCallback(async (overridePayload?: any) => {
    const now = Date.now();
    if (isLoading) return;
    if (!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && lastGenerateTime && now - lastGenerateTime < 60 * 1000) {
      // Already rate limited
      return;
    }
    if (!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) {
      startRateLimit();
    }
    clearError();

    const payload = {
      region: preferences.region,
      category: preferences.category,
      style: preferences.style,
      language: preferences.language,
      timeframeHours: Number(preferences.timeframe) || 24,
      limit: Number(preferences.limit) || 20,
      length: preferences.length || 'medium'
    };
    lastRequestRef.current = payload;
    await makeRequest(payload);
  }, [isLoading, preferences, makeRequest, clearError, lastGenerateTime, startRateLimit]);

  const handlePresetClick = useCallback(async (preset: string) => {
    let updates = {};

    if (preset === 'lt-local') {
      // Try server-side geo lookup first (IP-based). If it fails, fall back to browser locale.
      let regionGuess = 'global';
      let langGuess = preferences.language || 'en';
      try {
        const resp = await fetch('/api/geo');
        if (resp.ok) {
          const j = await resp.json();
          if (j && j.regionKey) regionGuess = j.regionKey;
          if (j && j.language) langGuess = j.language;
        } else {
          throw new Error('geo fetch failed');
        }
      } catch (e) {
        try {
          const navLang = navigator.language || (navigator as any).userLanguage || '';
          const primary = (navLang || '').split('-')[0].toLowerCase();
          regionGuess = detectRegionFromLanguage(primary);
          langGuess = detectLanguage();
        } catch (ex) {
          regionGuess = 'global';
          langGuess = preferences.language || 'en';
        }
      }

      updates = {
        region: regionGuess,
        category: 'top',
        language: langGuess,
        style: 'neutral',
        length: 'medium',
        timeframe: '24',
        limit: '20'
      };
    } else {
      const config = PRESET_CONFIGS[preset as keyof typeof PRESET_CONFIGS];
      if (config) {
        updates = config;
      }
    }

    // Apply updates to preferences so the UI reflects the preset
    Object.entries(updates).forEach(([key, value]) => {
      updatePreference(key as keyof Preferences, value as string);
    });

    // Mark this preset as selected in the UI but do NOT auto-generate.
    // Generation remains an explicit action (Generate button / keyboard shortcut).
    setSelectedPreset(preset);
  }, [updatePreference, preferences]);

  // Keyboard shortcuts
  useKeyboardShortcuts(generateSummary);

  const onApplyHistory = useCallback((payload: any) => {
    Object.entries(payload).forEach(([key, value]) => {
      updatePreference(key as keyof Preferences, String(value));
    });
    setActiveTab(0); // Switch to home tab
  }, [updatePreference]);

  return (
    <>
      <Head>
        <title>TLDRWire — AI-powered news summaries</title>
        <meta
          name="description"
          content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="TLDRWire — AI-powered news summaries" />
        <meta property="og:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TLDRWire — AI-powered news summaries" />
        <meta name="twitter:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%B0%3C/text%3E%3C/svg%3E" />
      </Head>

      <HomeHeader theme={theme} onToggleTheme={toggleTheme} />

      <HomeMain
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoading={isLoading}
        error={error}
        data={data}
        lastRequestRef={lastRequestRef}
        history={history}
        onApplyHistory={onApplyHistory}
        onDeleteHistory={removeHistoryItem}
        onClearHistory={clearHistory}
        preferences={preferences}
        updatePreference={updatePreference}
        onGenerate={generateSummary}
        onPresetClick={handlePresetClick}
        selectedPreset={selectedPreset}
        rateLimited={isRateLimited()}
        rateLimitCountdown={rateLimitCountdown}
        isDraggingSlider={isDraggingSlider}
        setIsDraggingSlider={setIsDraggingSlider}
      />

      <HomeModal
        selectedHistoryEntry={selectedHistoryEntry}
        setSelectedHistoryEntry={setSelectedHistoryEntry}
        onApplyHistory={onApplyHistory}
        onDeleteHistory={removeHistoryItem}
        updatePreference={updatePreference}
        setActiveTab={setActiveTab}
      />
    </>
  );
}
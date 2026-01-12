import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from './useTheme';
import { usePreferences } from './usePreferences';
import { useApi } from './useApi';
import { usePerformanceMonitoring } from './usePerformance';
import { useRateLimit } from './useRateLimit';
import { useHealthCheck } from './useHealthCheck';
import { useKeyboardShortcuts } from '../utils/keyboardShortcuts';
import { PRESET_CONFIGS } from '../constants/ui';
import { presets as DEFAULT_PRESETS } from '../constants/presets';
import { detectLanguage, detectRegionFromLanguage } from '../utils/language';

export function useHome() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError, history, clearHistory, removeHistoryItem } = useApi();
  usePerformanceMonitoring();
  useHealthCheck();

  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const lastRequestRef = useRef<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const { lastGenerateTime, rateLimitCountdown, startRateLimit, isRateLimited } = useRateLimit();

  useEffect(() => {
    // On first mount, if no preset is selected, choose one at random.
    // We check localStorage for an explicit preset selection to avoid
    // overriding a user's previous choice.
    try {
      const stored = localStorage.getItem('tldrwire:selectedPreset');
      if (!stored && DEFAULT_PRESETS && DEFAULT_PRESETS.length > 0) {
        const idx = Math.floor(Math.random() * DEFAULT_PRESETS.length);
        const key = DEFAULT_PRESETS[idx][0];
        // apply the preset using the existing handler so side-effects run
        // (it will also call setSelectedPreset)
        handlePresetClick(key);
      } else if (stored) {
        setSelectedPreset(stored);
      }
    } catch (e) {
      // ignore localStorage errors (e.g., SSR or privacy modes)
    }
  }, []);

  useEffect(() => {
    if (data && !isLoading) {
      setActiveTab(1);
    }
  }, [data, isLoading]);

  const generateSummary = useCallback(async (overridePayload?: any) => {
    const now = Date.now();
    if (isLoading) return;
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && lastGenerateTime && now - lastGenerateTime < 60 * 1000) {
      return;
    }
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) {
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
    let updates: Record<string, string> = {};

    if (preset === 'lt-local') {
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
      if (config) updates = config as Record<string,string>;
    }

    Object.entries(updates).forEach(([key, value]) => {
      updatePreference(key as any, value as string);
    });

    setSelectedPreset(preset);
    try {
      localStorage.setItem('tldrwire:selectedPreset', preset);
    } catch (e) {
      // ignore storage errors
    }
  }, [updatePreference, preferences]);

  useKeyboardShortcuts(generateSummary);

  const onApplyHistory = useCallback((payload: any) => {
    Object.entries(payload).forEach(([key, value]) => {
      updatePreference(key as any, String(value));
    });
    setActiveTab(0);
  }, [updatePreference]);

  return {
    theme,
    toggleTheme,
    preferences,
    updatePreference,
    resetPreferences,
    makeRequest,
    isLoading,
    error,
    data,
    clearError,
    history,
    clearHistory,
    removeHistoryItem,
    selectedHistoryEntry,
    setSelectedHistoryEntry,
    selectedSummaryRef,
    activeTab,
    setActiveTab,
    lastRequestRef,
    selectedPreset,
    setSelectedPreset,
    isDraggingSlider,
    setIsDraggingSlider,
    lastGenerateTime,
    rateLimitCountdown,
    startRateLimit,
    isRateLimited,
    generateSummary,
    handlePresetClick,
    onApplyHistory
  };
}

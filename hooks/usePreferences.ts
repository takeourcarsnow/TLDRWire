import { useState, useEffect, useCallback } from 'react';

export interface Preferences {
  region: string;
  category: string;
  style: string;
  language: string;
  timeframe: string;
  limit: string;
  length: string;
  query: string;
}

const defaultPreferences: Preferences = {
  region: 'global',
  category: 'top',
  style: 'neutral',
  language: 'en',
  timeframe: '24',
  limit: '20',
  length: 'medium',
  query: '',
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    // Load preferences from localStorage
    const loadedPrefs = { ...defaultPreferences };
    
    Object.keys(defaultPreferences).forEach((key) => {
      const value = localStorage.getItem(`tldrwire:${key}`);
      if (value !== null) {
        (loadedPrefs as any)[key] = value;
      }
    });

    // Auto-detect language if not set
    if (!localStorage.getItem('tldrwire:language')) {
      const lang = (navigator.language || 'en').slice(0, 2);
      if (['en', 'lt', 'de', 'fr', 'pt', 'ja', 'hi'].includes(lang)) {
        loadedPrefs.language = lang;
      }
    }

    setPreferences(loadedPrefs);
  }, []);

  const updatePreference = useCallback((key: keyof Preferences, value: string) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(`tldrwire:${key}`, value);
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    // Clear all preferences from localStorage
    Object.keys(defaultPreferences).forEach(key => {
      localStorage.removeItem(`tldrwire:${key}`);
    });
    
    // Reset to defaults
    const resetPrefs = { ...defaultPreferences };
    
    // Auto-detect language
    const lang = (navigator.language || 'en').slice(0, 2);
    if (['en', 'lt', 'de', 'fr', 'pt', 'ja', 'hi'].includes(lang)) {
      resetPrefs.language = lang;
    }
    
    setPreferences(resetPrefs);
  }, []);

  return { preferences, updatePreference, resetPreferences };
}
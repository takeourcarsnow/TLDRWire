import { useState, useEffect, useCallback } from 'react';
import { detectLanguage } from '../utils/language';

export interface Preferences {
  region: string;
  category: string;
  style: string;
  language: string;
  timeframe: string;
  limit: string;
  length: string;
}

const defaultPreferences: Preferences = {
  region: 'global',
  category: 'top',
  style: 'casual',
  language: 'en',
  timeframe: '6',
  limit: '15',
  length: 'short',
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
      loadedPrefs.language = detectLanguage();
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
    resetPrefs.language = detectLanguage();
    
    setPreferences(resetPrefs);
  }, []);

  return { preferences, updatePreference, resetPreferences };
}
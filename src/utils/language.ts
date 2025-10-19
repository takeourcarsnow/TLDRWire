// Utility functions for language and locale detection

import { SUPPORTED_LANGUAGES } from '../pages/api/uiConstants';

/**
 * Detects the user's preferred language from browser settings
 */
export const detectLanguage = (): string => {
  const lang = (navigator.language || (navigator as any).userLanguage || 'en').slice(0, 2);
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
};

/**
 * Detects region based on language (fallback for geo lookup)
 */
export const detectRegionFromLanguage = (language: string): string => {
  const primary = language.toLowerCase();
  switch (primary) {
    case 'lt': return 'lithuania';
    case 'fr': return 'france';
    case 'de': return 'germany';
    case 'es': return 'spain';
    case 'it': return 'italy';
    default: return 'global';
  }
};
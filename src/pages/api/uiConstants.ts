// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'lt', 'de', 'fr', 'pt', 'ja', 'hi'];

// Length presets
export const LENGTH_OPTIONS = ['short', 'medium', 'long', 'very-long'];
export const LENGTH_CONFIGS = {
  short: { tldrSentences: '1 sentence', bulletsMin: 4, bulletsMax: 6 },
  medium: { tldrSentences: '2–3 sentences', bulletsMin: 6, bulletsMax: 9 },
  long: { tldrSentences: '4–5 sentences', bulletsMin: 8, bulletsMax: 12 },
  'very-long': { tldrSentences: '6–8 sentences', bulletsMin: 10, bulletsMax: 16 }
};

// Slider ranges
export const TIMEFRAME_MIN = 1;
export const TIMEFRAME_MAX = 72;
export const ARTICLES_MIN = 8;
export const ARTICLES_MAX = 40;
export default (_req: any, res: any) => res.status(404).end();

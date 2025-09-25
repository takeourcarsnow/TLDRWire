// Locale utilities: parse and normalize BCP-47, derive fallbacks, and simple prefs

export interface ParsedLocale {
  raw: string;
  normalized: string;
  language: string;
  region?: string;
  script?: string;
}

interface PickClientLocaleParams {
  bodyLocale?: string;
  bodyLanguage?: string;
  acceptLanguage?: string;
}

function safeCanonicalLocale(input: string): string {
  try {
    const arr = Intl.getCanonicalLocales(input || '');
    return arr && arr[0] ? arr[0] : (input || '').trim();
  } catch {
    return (input || '').trim();
  }
}

function parseLocale(raw?: string): ParsedLocale {
  const value = safeCanonicalLocale((raw || '').trim());
  if (!value) return { raw: '', normalized: 'en-US', language: 'en', region: 'US', script: undefined };
  
  const parts = value.split('-');
  let language: string | undefined = undefined;
  let script: string | undefined = undefined;
  let region: string | undefined = undefined;
  
  for (const p of parts) {
    if (!language && /^[a-zA-Z]{2,3}$/.test(p)) language = p.toLowerCase();
    else if (!script && /^[A-Z][a-z]{3}$/.test(p)) script = p; // Titlecase Script
    else if (!region && /^([A-Z]{2}|\d{3})$/.test(p)) region = p.toUpperCase();
  }
  
  // Defaults
  if (!language) language = 'en';
  if (!region) region = language === 'en' ? 'US' : undefined;
  
  const normalized = [language, script, region].filter(Boolean).join('-') || 'en-US';
  return { raw: raw || value, normalized, language, script, region };
}

function pickClientLocale({ bodyLocale, bodyLanguage, acceptLanguage }: PickClientLocaleParams): ParsedLocale {
  // Priority: explicit body.locale -> explicit body.language (accepts 2-letter codes or full locales) -> Accept-Language -> default
  let candidate: string | undefined = undefined;
  
  if (bodyLocale && typeof bodyLocale === 'string' && bodyLocale.trim()) {
    candidate = bodyLocale.trim();
  } else if (bodyLanguage && typeof bodyLanguage === 'string' && bodyLanguage.trim()) {
    // Honor an explicit language preference from the request body even if it's just a 2-letter code
    candidate = bodyLanguage.trim();
  } else if (acceptLanguage && typeof acceptLanguage === 'string') {
    const primary = acceptLanguage.split(',')[0]?.trim();
    if (primary) candidate = primary;
  }
  
  const parsed = parseLocale(candidate || 'en-US');
  
  // If only language came through and no region, attempt a sensible default
  if (!parsed.region) {
    const fallbackRegion: { [key: string]: string } = {
      en: 'US', es: 'ES', pt: 'PT', fr: 'FR', de: 'DE', lt: 'LT', ja: 'JP', hi: 'IN', bn: 'BD',
      ar: 'SA', zh: 'CN', ru: 'RU'
    };
    parsed.region = fallbackRegion[parsed.language] || 'US';
    parsed.normalized = [parsed.language, parsed.script, parsed.region].filter(Boolean).join('-');
  }
  
  return parsed;
}

function prefers12Hour(region?: string): boolean {
  // Rough heuristic; most locales use 24h except a few
  return ['US', 'PH', 'CA', 'AU', 'NZ'].includes(String(region || '').toUpperCase());
}

function unitsForRegion(region?: string): 'imperial' | 'metric' {
  const r = String(region || '').toUpperCase();
  return ['US', 'LR', 'MM'].includes(r) ? 'imperial' : 'metric';
}

export {
  parseLocale,
  pickClientLocale,
  prefers12Hour,
  unitsForRegion,
};
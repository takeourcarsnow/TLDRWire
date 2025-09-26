import { REGION_MAP, FEED_LANG_MAP, CATEGORY_QUERIES, TOPIC_MAP, GLOBAL_GLS, FALLBACK_FEEDS } from './constants';

export interface FeedUrlParams {
  gl: string;
  hl: string;
  ceid: string;
}

export interface RegionConfig {
  name: string;
  gl: string;
  hl: string;
  ceid: string;
  geo: string;
}

export interface SearchFeedParams extends FeedUrlParams {
  q: string;
}

export interface GeoFeedParams extends FeedUrlParams {
  geo: string;
}

export interface BuildFeedUrlsParams {
  region: string;
  category?: string;
  query?: string;
  hours?: number;
  lang: string;
}

export function getRegionConfig(regionKey: string, lang: string): RegionConfig {
  const def = REGION_MAP[regionKey] || REGION_MAP.global;
  const language = (lang || "en").toLowerCase();
  let gl = def.gl;
  // For Google News RSS, if language is not English, try to use a matching gl
  if (language === 'de') gl = 'DE';
  else if (language === 'fr') gl = 'FR';
  else if (language === 'es') gl = 'ES';
  else if (language === 'it') gl = 'IT';
  else if (language === 'pt') gl = 'BR'; // or PT
  else if (language === 'ja') gl = 'JP';
  else if (language === 'ko') gl = 'KR';
  else if (language === 'zh') gl = 'CN';
  else if (language === 'ru') gl = 'RU';
  else if (language === 'pl') gl = 'PL';
  else gl = def.gl;
  const hl = language; // UI language
  const ceid = `${gl}:${language}`; // country:language
  const geo = def.geo;
  return { name: def.name, gl, hl, ceid, geo };
}

export function buildSearchFeedURL({ q, hl, gl, ceid }: SearchFeedParams): string {
  const base = "https://news.google.com/rss/search";
  const params = new URLSearchParams({ q, hl, gl, ceid });
  return `${base}?${params.toString()}`;
}

export function buildGeoFeedURL({ geo, hl, gl, ceid }: GeoFeedParams): string {
  const base = `https://news.google.com/rss/headlines/section/geo/${encodeURIComponent(geo)}`;
  const params = new URLSearchParams({ hl, gl, ceid });
  return `${base}?${params.toString()}`;
}

export function buildTopFeedURL({ hl, gl, ceid }: FeedUrlParams): string {
  const base = `https://news.google.com/rss`;
  const params = new URLSearchParams({ hl, gl, ceid });
  return `${base}?${params.toString()}`;
}

export function buildTopicFeedURL(topicCode: string, { hl, gl, ceid }: FeedUrlParams): string {
  const base = `https://news.google.com/rss/topics/${topicCode}`;
  const params = new URLSearchParams({ hl, gl, ceid });
  return `${base}?${params.toString()}`;
}

export function buildCategoryFeedURL(category: string, { hl, gl, ceid }: FeedUrlParams): string {
  const query = CATEGORY_QUERIES[category];
  if (!query) {
    return buildTopFeedURL({ hl, gl, ceid });
  }

  return buildSearchFeedURL({ q: query, hl, gl, ceid });
}

// hours is currently unused but kept in the signature for future window-based feed logic
export function buildFeedUrls({ region, category, query, hours: _hours, lang }: BuildFeedUrlsParams): string[] {
  // _hours reserved for future time-window based feed selection logic
  void _hours;
  const config = getRegionConfig(region, lang);
  const urls: string[] = [];

  if (query) {
    urls.push(buildSearchFeedURL({ q: query, ...config }));
  }

  if (category && TOPIC_MAP[category]) {
    const topicCode = TOPIC_MAP[category];
    urls.push(buildTopicFeedURL(topicCode, config));
  }

  if (!query && !category) {
    urls.push(buildTopFeedURL(config));
    if (config.geo !== 'World') {
      urls.push(buildGeoFeedURL({ geo: config.geo, hl: config.hl, gl: config.gl, ceid: config.ceid }));
    }
  }

  return urls;
}

export function addLtFeedsToBuild(urls: string[], config: RegionConfig, query?: string, category?: string): void {
  const ltLangs = FEED_LANG_MAP.lithuania || [];
  for (const ltLang of ltLangs) {
    const ltConfig = getRegionConfig('lithuania', ltLang);
    if (query) {
      urls.push(buildSearchFeedURL({ q: query, ...ltConfig }));
    } else if (category && TOPIC_MAP[category]) {
      const topicCode = TOPIC_MAP[category];
      urls.push(buildTopicFeedURL(topicCode, ltConfig));
    } else {
      urls.push(buildTopFeedURL(ltConfig));
      urls.push(buildGeoFeedURL({ geo: ltConfig.geo, hl: ltConfig.hl, gl: ltConfig.gl, ceid: ltConfig.ceid }));
    }
  }
}

export function addGlobalFeeds(urls: string[], config: RegionConfig, query?: string, category?: string): void {
  for (const gl of GLOBAL_GLS) {
    const globalConfig = { ...config, gl };
    if (query) {
      urls.push(buildSearchFeedURL({ q: query, ...globalConfig }));
    } else if (category && TOPIC_MAP[category]) {
      const topicCode = TOPIC_MAP[category];
      urls.push(buildTopicFeedURL(topicCode, globalConfig));
    } else {
      urls.push(buildTopFeedURL(globalConfig));
    }
  }
}

export function resolveCategory(categoryKey?: string): string {
  if (!categoryKey || categoryKey === 'top' || categoryKey === 'world') {
    return 'top';
  }
  return CATEGORY_QUERIES[categoryKey] ? categoryKey : 'top';
}

export function buildAllFeeds({ region, category, query, hours: _hours, lang }: BuildFeedUrlsParams): string[] {
  // _hours reserved for future logic
  void _hours;
  const config = getRegionConfig(region, lang);
  const urls = buildFeedUrls({ region, category, query, hours: _hours, lang });

  if (region === 'lithuania') {
    addLtFeedsToBuild(urls, config, query, category);
  }

  if (!query) {
    addGlobalFeeds(urls, config, query, category);
  }

  return Array.from(new Set(urls));
}

// Returns Google News feeds plus a conservative set of fallback publisher RSS feeds.
// The combined list is de-duplicated and returned in a stable order: fallbacks
// first, then google news urls.
export function getAllFeedsWithFallbacks(params: BuildFeedUrlsParams, maxFeeds = 16): string[] {
  const googleUrls = buildAllFeeds(params);
  const category = params.category ? resolveCategory(params.category) : 'top';
  const fallbacks = FALLBACK_FEEDS[category] || FALLBACK_FEEDS['top'] || [];

  // Include region-specific fallbacks (e.g., Lithuanian, Indian, US outlets) when relevant
  let regionFallbacks: string[] = [];
  try {
    const regionKey = (params.region || '').toLowerCase();
    if (regionKey && FALLBACK_FEEDS[regionKey]) {
      regionFallbacks = FALLBACK_FEEDS[regionKey];
    }
  } catch (e) {
    regionFallbacks = [];
  }

  // Merge while preserving fallbacks first. Append category fallbacks, then region-specific ones, then google.
  const merged = [...fallbacks, ...regionFallbacks, ...googleUrls];

  // De-duplicate while preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of merged) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
    if (out.length >= maxFeeds) break;
  }

  return out;
}
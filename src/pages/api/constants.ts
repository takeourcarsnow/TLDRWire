// Re-export specific constants needed by the client-side code
export {
  CACHE_TTL_MS,
  API_TIMEOUT_MS,
  MAX_RETRIES,
  SERVER_CACHE_TTL_MS,
  LLM_NEGATIVE_CACHE_MS,
  IP_THROTTLE_MS
} from './api';

export {
  HISTORY_KEY,
  HISTORY_LIMIT,
  CLIENT_CACHE_SIZE
} from './storage';

// Re-export all other constants for server-side use
export type { RegionConfig } from './regions';
export {
  REGION_MAP,
  FEED_LANG_MAP
} from './regions';

export {
  CATEGORY_QUERIES,
  CATEGORY_FILTERS,
  TOPIC_MAP
} from './categories';

export {
  GLOBAL_GLS,
  FALLBACK_FEEDS
} from './feedConstants';

export {
  SUPPORTED_LANGUAGES,
  LENGTH_OPTIONS,
  LENGTH_CONFIGS,
  TIMEFRAME_MIN,
  TIMEFRAME_MAX,
  ARTICLES_MIN,
  ARTICLES_MAX
} from './uiConstants';

export {
  SPORT_TYPES
} from './sports';
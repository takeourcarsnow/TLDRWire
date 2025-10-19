// API related constants
export const API_TIMEOUT_MS = 60000;
export const MAX_RETRIES = 1;
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (client-side) - increased from 5
export const SERVER_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes (server-side) - increased from 15
export const LLM_NEGATIVE_CACHE_MS = 20 * 60 * 1000; // 20 minutes
export const IP_THROTTLE_MS = 5 * 1000; // 5 seconds
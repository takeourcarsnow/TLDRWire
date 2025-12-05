// API related constants
export const API_TIMEOUT_MS = 60000;
export const MAX_RETRIES = 1;
export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (client-side) - extended for reduced server load
export const SERVER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (server-side) - extended for reduced server load
export const LLM_NEGATIVE_CACHE_MS = 30 * 60 * 1000; // 30 minutes
export const IP_THROTTLE_MS = 5 * 1000; // 5 seconds
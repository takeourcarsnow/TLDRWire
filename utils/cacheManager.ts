import { CacheEntry, ApiResponse } from '../types/tldr';
import {
  SERVER_CACHE_TTL_MS,
  LLM_NEGATIVE_CACHE_MS,
  IP_THROTTLE_MS
} from '../pages/api/constants';

// Server-side cache to reduce LLM/function invocations from frequent identical requests
export const CACHE = new Map<string, CacheEntry>();
export const SERVER_CACHE_TTL = SERVER_CACHE_TTL_MS; // 20 minutes

// In-flight request deduplication
export const INFLIGHT = new Map<string, Promise<{ status: number; payload: ApiResponse }>>();

// Simple in-memory negative-cache to avoid repeated LLM calls when quota is hit
export const LLM_NEGATIVE_CACHE = new Map<string, number>();
export const NEGATIVE_CACHE_TTL = LLM_NEGATIVE_CACHE_MS; // default 20 minutes

// Lightweight per-IP throttle to avoid accidental or malicious tight loops
export const LAST_REQUEST_BY_IP = new Map<string, number>();
export const THROTTLE_WINDOW = IP_THROTTLE_MS; // 5 seconds

export const cacheManager = {
  get: (key: string): CacheEntry | undefined => CACHE.get(key),

  set: (key: string, entry: CacheEntry): void => {
    CACHE.set(key, entry);
  },

  isExpired: (entry: CacheEntry): boolean => {
    return Date.now() - entry.ts >= SERVER_CACHE_TTL;
  },

  getInflight: (key: string): Promise<{ status: number; payload: ApiResponse }> | undefined => {
    return INFLIGHT.get(key);
  },

  setInflight: (key: string, promise: Promise<{ status: number; payload: ApiResponse }>): void => {
    INFLIGHT.set(key, promise);
  },

  deleteInflight: (key: string): void => {
    INFLIGHT.delete(key);
  },

  getNegativeCache: (key: string): number | undefined => {
    return LLM_NEGATIVE_CACHE.get(key);
  },

  setNegativeCache: (key: string, expireTime: number): void => {
    LLM_NEGATIVE_CACHE.set(key, expireTime);
  },

  checkThrottle: (ip: string): { throttled: boolean; sinceLastMs: number } => {
    const last = LAST_REQUEST_BY_IP.get(ip) || 0;
    const now = Date.now();
    LAST_REQUEST_BY_IP.set(ip, now);
    const sinceLastMs = now - last;
    return { throttled: sinceLastMs < THROTTLE_WINDOW, sinceLastMs };
  }
};
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CACHE_TTL_MS,
  API_TIMEOUT_MS,
  MAX_RETRIES,
  HISTORY_KEY,
  HISTORY_LIMIT,
  CLIENT_CACHE_SIZE
} from '../constants/clientConstants';
import { postTldr } from '../utils/apiClient';

export interface ApiRequestPayload {
  region: string;
  category: string;
  style: string;
  language: string;
  timeframeHours: number;
  limit: number;
  length: string;
}

export interface ApiResponse {
  ok: boolean;
  summary?: string;
  meta?: {
    region: string;
    category: string;
    style: string;
    timeframeHours: number;
      language?: string;
      locale?: string;
    usedArticles: number;
    length: string;
    model: string;
  };
  cached?: boolean;
  error?: string;
  articles?: { title: string; url: string; publishedAt: number; source: string; imageUrl: string | null }[];
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  payload: ApiRequestPayload;
  meta?: ApiResponse['meta'];
  cached?: boolean;
  summarySnippet?: string;
  summaryFull?: string;
  summaryLength?: number;
}

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Load history from localStorage on client
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      // ignore
    }
  }, []);
  const persistHistory = (entries: HistoryEntry[]) => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch {}
  };
  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }, []);
  const removeHistoryItem = useCallback((id: number) => {
    setHistory((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistHistory(next);
      return next;
    });
  }, []);
  const cache = useRef(new Map());
  // Track in-flight requests to avoid sending duplicate identical POSTs
  const inflightRequests = useRef(new Map<string, Promise<ApiResponse>>());
  const currentController = useRef<AbortController | null>(null);

  const getCacheKey = (payload: ApiRequestPayload) => {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Invalid payload for cache key');
    }
    return JSON.stringify(payload);
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const makeRequest = useCallback(async (
    payload: ApiRequestPayload, 
    retryCount = 0, 
    options: { timeoutMs?: number } = {}
  ) => {
    const timeoutMs = options.timeoutMs || API_TIMEOUT_MS;
    const cacheKey = getCacheKey(payload);

    // Check cache
    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setData({ ...cached.data, cached: true });
      return { ...cached.data, cached: true };
    }

    // If an identical request is already in-flight, return its promise instead of
    // issuing a new network request.
    if (inflightRequests.current.has(cacheKey)) {
      try {
        const existing = inflightRequests.current.get(cacheKey)!;
        const result = await existing;
        setData(result);
        return result;
      } catch (e) {
        inflightRequests.current.delete(cacheKey);
        // continue to issue a fresh request
      }
    }

    setIsLoading(true);
    setError(null);

    // Cancel previous request if one is in-flight
    if (currentController.current) {
      try { currentController.current.abort(); } catch (_) {}
    }

    const controller = new AbortController();
    currentController.current = controller;

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      try { controller.abort(); } catch (e) {}
    }, timeoutMs);

    // Create the network promise and store it so concurrent callers reuse it
    const networkPromise: Promise<ApiResponse> = (async () => {
      try {
        const responseData = await postTldr(payload, controller.signal);

        // Cache the response
        cache.current.set(cacheKey, { data: responseData, timestamp: Date.now() });
        if (cache.current.size > CLIENT_CACHE_SIZE) {
          const oldestKey = cache.current.keys().next().value;
          cache.current.delete(oldestKey);
        }

        setData(responseData);
        try {
          const full = responseData?.summary || '';
          const entry: HistoryEntry = {
            id: Date.now(),
            timestamp: Date.now(),
            payload,
            meta: responseData?.meta,
            cached: Boolean(responseData?.cached),
            summarySnippet: full.slice(0, 300),
            summaryFull: full,
            summaryLength: full.length || 0
          };
          setHistory((prev) => {
            const next = [entry, ...prev].slice(0, HISTORY_LIMIT);
            persistHistory(next);
            return next;
          });
        } catch {}

        return responseData as ApiResponse;
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    inflightRequests.current.set(cacheKey, networkPromise);

    try {
      const result = await networkPromise;
      setIsLoading(false);
      return result;
    } catch (err: any) {
      setIsLoading(false);
      if (err && err.name === 'AbortError') {
        if (timedOut) {
          const timeoutError = 'Request timed out';
          setError(timeoutError);
          return { ok: false, error: timeoutError } as ApiResponse;
        }
        const cancelError = 'Request was cancelled';
        setError(cancelError);
        return { ok: false, error: cancelError } as ApiResponse;
      }

      const errMsg = String(err?.message || err?.toString?.() || '');
      const errMsgLc = errMsg.toLowerCase();
      if (
        retryCount < MAX_RETRIES &&
        (errMsgLc.includes('network') || errMsgLc.includes('fetch') || errMsgLc.includes('timed out'))
      ) {
        console.warn(`Retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
        inflightRequests.current.delete(cacheKey);
        return makeRequest(payload, retryCount + 1, options);
      }

      setError(errMsg);
      return { ok: false, error: errMsg } as ApiResponse;
    } finally {
      inflightRequests.current.delete(cacheKey);
    }
  }, []);

  return { 
    makeRequest,
    isLoading,
    error,
    data,
    clearError,
    // History API
    history,
    clearHistory,
    removeHistoryItem
  };
}
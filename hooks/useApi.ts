import { useState, useCallback, useRef, useEffect } from 'react';

const CONFIG = {
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  API_TIMEOUT: 60000,
  MAX_RETRIES: 1
};

export interface ApiRequestPayload {
  region: string;
  category: string;
  style: string;
  language: string;
  timeframeHours: number;
  limit: number;
  length: string;
  query: string;
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
  const HISTORY_KEY = 'tldrwire:history';
  const HISTORY_LIMIT = 200;
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
    const timeoutMs = options.timeoutMs || CONFIG.API_TIMEOUT;
    const cacheKey = getCacheKey(payload);

    // Check cache
    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
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
        const response = await fetch('/api/tldr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          const msg = `Invalid response format. ${text.slice(0, 200)}`;
          setError(msg);
          return { ok: false, error: msg } as ApiResponse;
        }

        const responseData = await response.json();

        if (!response.ok) {
          console.warn('API returned non-OK HTTP status', response.status, responseData);
          const baseErr = responseData?.error || `HTTP ${response.status}: ${response.statusText}`;
          const details = responseData?.details ? ` Details: ${responseData.details}` : '';
          const msg = baseErr + details;
          setError(msg);
          return { ok: false, error: msg } as ApiResponse;
        }

        if (!responseData.ok) {
          console.warn('API returned ok=false payload', responseData);
          const baseErr = responseData?.error || 'Request failed';
          const details = responseData?.details ? ` Details: ${responseData.details}` : '';
          const msg = baseErr + details;
          setError(msg);
          return { ok: false, error: msg } as ApiResponse;
        }

        // Cache the response
        cache.current.set(cacheKey, { data: responseData, timestamp: Date.now() });
        if (cache.current.size > 50) {
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

        return responseData;
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
        retryCount < CONFIG.MAX_RETRIES &&
        (errMsgLc.includes('network') || errMsgLc.includes('fetch') || errMsgLc.includes('timed out'))
      ) {
        console.warn(`Retry attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}`);
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
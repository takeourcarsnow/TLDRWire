export interface RequestBody {
  region?: string;
  category?: string;
  style?: string;
  timeframeHours?: number;
  limit?: number;
  language?: string;
  locale?: string;
  length?: string;
}

export interface Article {
  title: string;
  url: string;
  publishedAt: number;
  source: string;
  imageUrl: string | null;
}

// TopItem represents the more flexible raw item shape coming from RSS
// parsers / feed processing. Fields are optional because different
// feeds expose different metadata.
export interface TopItem {
  title?: string;
  link?: string;
  url?: string;
  isoDate?: string;
  pubDate?: number | string;
  snippet?: string;
  content?: string;
  source?: string;
  imageUrl?: string | null;
}

export interface ApiResponse {
  ok: boolean;
  cached?: boolean;
  error?: string;
  details?: string;
  // Optional property to capture LLM-specific errors for diagnostics
  llmError?: string | null;
  meta?: {
    region: string;
    category: string;
    style: string;
    timeframeHours: number;
    language: string;
    locale: string;
    usedArticles: number;
    model: string;
    fallback?: boolean;
    length: string;
  };
  summary?: string;
  images?: { title: string; url: string; imageUrl: string }[];
  articles?: Article[];
}

export interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}
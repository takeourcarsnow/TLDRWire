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

export interface ApiResponse {
  ok: boolean;
  cached?: boolean;
  error?: string;
  details?: string;
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
}

export interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}
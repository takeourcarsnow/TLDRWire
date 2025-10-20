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
  articles?: Article[];
}

export interface CacheEntry {
  ts: number;
  payload: ApiResponse;
}
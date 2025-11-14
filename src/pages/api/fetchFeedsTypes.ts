export type FetchFeedsResult = {
  items: any[];
  urls: string[];
  perFeedCounts: number[];
  perFeedErrors: Array<string | null>;
  usedFallbacks: boolean;
  topHosts: Array<{ host: string; count: number }>;
};

export type FetchFeedsOptions = {
  region: string;
  category: string;
  query: string;
  hours: number;
  language: string;
  loggerContext?: any;
  maxFeeds?: number;
  desiredItems?: number;
};
export default (_req: any, res: any) => res.status(404).end();

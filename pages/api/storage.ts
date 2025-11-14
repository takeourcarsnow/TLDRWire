// History and storage
export const HISTORY_KEY = 'tldrwire:history';
export const HISTORY_LIMIT = 200;
export const RATE_LIMIT_KEY = 'tldrwire:rateLimitExpires';
export const RATE_LIMIT_SECONDS = 60;

// Cache sizes
export const CLIENT_CACHE_SIZE = 50;
export default (_req: any, res: any) => res.status(404).end();

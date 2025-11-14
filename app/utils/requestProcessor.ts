import type { NextApiRequest } from 'next';
import { pickClientLocale, type ParsedLocale } from '../../pages/api/locale';
import logger from '../utils/logger';
import { RequestBody } from '../types/tldr';

export interface ProcessedRequest {
  body: RequestBody;
  cacheKey: string;
  requestLog: any;
  ip: string;
  userAgent: string;
}

interface RequestProcessor {
  parseBody: (req: NextApiRequest) => RequestBody;
  extractParameters: (body: RequestBody, req: NextApiRequest) => any;
  createCacheKey: (params: any) => string;
  createLogger: (params: any) => any;
  logRequest: (requestLog: any, req: NextApiRequest) => { ip: string; userAgent: string };
  process: (req: NextApiRequest) => ProcessedRequest;
}

export const requestProcessor: RequestProcessor = {
  parseBody: (req: NextApiRequest): RequestBody => {
    let body: RequestBody = req.body;
    if (!body) {
      try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
    } else if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    return body || {};
  },

  extractParameters: (body: RequestBody, req: NextApiRequest) => {
    const {
      region = 'global',
      category = 'top',
      style = 'neutral',
      timeframeHours = 24,
      limit = 20,
      language: bodyLanguage,
      locale: bodyLocale,
      length = 'medium'
    } = body;

    const acceptLanguage = (Array.isArray(req.headers['accept-language']) ? req.headers['accept-language'][0] : req.headers['accept-language']) || (Array.isArray(req.headers['Accept-Language']) ? req.headers['Accept-Language'][0] : req.headers['Accept-Language']);
    const localePref: ParsedLocale = pickClientLocale({ bodyLocale, bodyLanguage, acceptLanguage });
    const language = (localePref.language || 'en');
    const uiLocale = localePref.normalized;

    return {
      region,
      category,
      style,
      timeframeHours,
      limit,
      language,
      uiLocale,
      length
    };
  },

  createCacheKey: (params: ReturnType<typeof requestProcessor.extractParameters>): string => {
    const { region, category, style, timeframeHours, limit, language, uiLocale, length } = params;
    return JSON.stringify({ region, category, style, timeframeHours, limit, language, length, uiLocale });
  },

  createLogger: (params: ReturnType<typeof requestProcessor.extractParameters>): any => {
    const { region, category, style, timeframeHours, limit, language, uiLocale, length } = params;
    return logger.child({ route: '/api/tldr', region, category, style, timeframeHours, limit, language, length, uiLocale });
  },

  logRequest: (requestLog: any, req: NextApiRequest): { ip: string; userAgent: string } => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
    const userAgent = (req.headers['user-agent'] || '<no-ua>') as string;

    requestLog.info('request received', { ip, userAgent });

    // Log suspicious requests for debugging
    try {
      const origin = (req.headers['origin'] || req.headers['referer'] || '').toString();
      const xreq = (req.headers['x-requested-with'] || '').toString();
      const uaLc = userAgent.toLowerCase();
      const looksLikeBot = /bot|crawler|spider|python|aiohttp|fetch/i.test(uaLc) || !origin || (!xreq && process.env.NODE_ENV === 'production');

      if (looksLikeBot) {
        const hdrs: Record<string,string> = {};
        ['user-agent','x-forwarded-for','origin','referer','host','accept','content-type','x-requested-with'].forEach((k) => {
          try { const v = req.headers[k as keyof typeof req.headers]; if (v) hdrs[k] = Array.isArray(v) ? v[0] : String(v); } catch (e) {}
        });
        const rawBody = (() => {
          try { const b = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}); return b.slice(0, 1024); } catch (e) { return '<body-read-error>'; }
        })();
        requestLog.warn('suspicious request (bot-like or missing browser headers)', { ip, ua: uaLc, origin, xRequestedWith: xreq, headers: hdrs, bodySnippet: rawBody });
      }
    } catch (e) { /* ignore any logging errors */ }

    return { ip, userAgent };
  },

  process: (req: NextApiRequest): ProcessedRequest => {
    const body = requestProcessor.parseBody(req);
    const params = requestProcessor.extractParameters(body, req);
    const cacheKey = requestProcessor.createCacheKey(params);
    const requestLog = requestProcessor.createLogger(params);
    const { ip, userAgent } = requestProcessor.logRequest(requestLog, req);

    return {
      body,
      cacheKey,
      requestLog,
      ip,
      userAgent
    };
  }
};
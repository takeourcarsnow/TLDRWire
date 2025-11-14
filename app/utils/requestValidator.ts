import type { NextApiRequest } from 'next';
import logger from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  statusCode?: number;
  error?: string;
  shouldLog?: boolean;
}

export const requestValidator = {
  validateMethod: (req: NextApiRequest): ValidationResult => {
    if (req.method !== 'POST') {
      return {
        valid: false,
        statusCode: 405,
        error: 'Method Not Allowed'
      };
    }
    return { valid: true };
  },

  validateBotTraffic: (req: NextApiRequest): ValidationResult => {
    try {
      const ua = (req.headers['user-agent'] || '').toString().toLowerCase();
      const xreq = (req.headers['x-requested-with'] || '').toString();
      const isLikelyBot = /bot|crawler|spider|python|aiohttp|curl|monitor|uptime|lambda/i.test(ua);

      if (process.env.NODE_ENV === 'production' && (isLikelyBot || !xreq)) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        logger.warn('fast-rejecting non-browser request', { ua, ip });
        return {
          valid: false,
          statusCode: 403,
          error: 'API access restricted'
        };
      }
    } catch (e) {
      // ignore filter errors and continue
    }
    return { valid: true };
  },

  validateOrigin: (req: NextApiRequest): ValidationResult => {
    try {
      if (process.env.NODE_ENV === 'production') {
        const xreq = (req.headers['x-requested-with'] || '').toString();
        if (!xreq || xreq.toLowerCase() !== 'xmlhttprequest') {
          return {
            valid: false,
            statusCode: 403,
            error: 'API access restricted: must originate from UI'
          };
        }
      }
    } catch (e) { /* ignore header check failures */ }
    return { valid: true };
  },

  validateAllowedOrigin: (req: NextApiRequest): ValidationResult => {
    try {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOWED_ORIGIN) {
        const allowed = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN;
        const origin = (req.headers['origin'] || req.headers['referer'] || '').toString();
        if (!origin || origin.indexOf(allowed) === -1) {
          logger.warn('request rejected: origin/referrer mismatch', { origin, allowed });
          return {
            valid: false,
            statusCode: 403,
            error: 'API access restricted: invalid origin'
          };
        }
      }
    } catch (e) {
      // If validation throws for any reason, fall back to the existing header check
    }
    return { valid: true };
  },

  validateAll: (req: NextApiRequest): ValidationResult => {
    // Check method first
    const methodResult = requestValidator.validateMethod(req);
    if (!methodResult.valid) return methodResult;

    // Check for bot traffic
    const botResult = requestValidator.validateBotTraffic(req);
    if (!botResult.valid) return botResult;

    // Check origin
    const originResult = requestValidator.validateOrigin(req);
    if (!originResult.valid) return originResult;

    // Check allowed origin
    const allowedOriginResult = requestValidator.validateAllowedOrigin(req);
    if (!allowedOriginResult.valid) return allowedOriginResult;

    return { valid: true };
  }
};
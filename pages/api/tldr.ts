// Next.js API Route: TL;DR summarizer (modularized)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getModel } from './llm';
import logger from './logger';
import { ApiResponse } from '../../types/tldr';
import { requestValidator } from '../../utils/requestValidator';
import { requestProcessor } from '../../utils/requestProcessor';
import { responseHandler } from '../../utils/responseHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    // Validate request
    const validation = requestValidator.validateAll(req);
    if (!validation.valid) {
      if (validation.statusCode === 405) {
        res.setHeader('Allow', 'POST');
      }
      return res.status(validation.statusCode || 400).json({
        ok: false,
        error: validation.error
      });
    }

    // Check if model is available
    if (!getModel()) {
      return res.status(500).json({
        ok: false,
        error: 'GEMINI_API_KEY missing. Configure it in Vercel Project Settings > Environment Variables.'
      });
    }

    // Process request
    const processed = requestProcessor.process(req);
    const { cacheKey, requestLog, ip } = processed;

    // Extract parameters
    const params = requestProcessor.extractParameters(processed.body, req);

    // Check cache first
    const cachedResponse = responseHandler.checkCache(cacheKey);
    if (cachedResponse) {
      requestLog.info('cache hit', { ageMs: Date.now() - (cachedResponse as any).ts });
      return res.status(200).json(cachedResponse);
    }

    // Check throttling
    const throttleCheck = responseHandler.checkThrottle(ip, requestLog);
    if (throttleCheck.throttled) {
      return res.status(429).json(throttleCheck.error || { ok: false, error: 'Too many requests' });
    }

    // Compute response
    const computeFn = () => responseHandler.computeResponse({
      ...params,
      cacheKey,
      requestLog
    });

    const result = await responseHandler.getOrCompute(cacheKey, computeFn);

    if (result.status === 404) {
      return res.status(404).json(result.payload);
    }

    return res.status(200).json(result.payload);
  } catch (err: any) {
    logger.error('tldr handler error', { message: err?.message, stack: err?.stack });
    if (err && typeof err.message === 'string' && err.message.toLowerCase().includes('timed out')) {
      return res.status(504).json({ ok: false, error: 'Request timed out', details: err.message });
    }
    return res.status(500).json({ ok: false, error: 'Server error', details: err?.message });
  }
}

export const config = { maxDuration: 60 };
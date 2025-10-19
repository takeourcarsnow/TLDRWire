import { summarizeWithLLM } from '../pages/api/summarize';
import { cacheManager, NEGATIVE_CACHE_TTL } from './cacheManager';

export async function summarizeWithPossibleFallback(params: {
  regionName: string;
  catName: string;
  maxAge: number;
  style: string;
  language: string;
  uiLocale: string;
  lengthPreset: string;
  lengthConfig: any;
  contextLines: string[];
  requestLog: any;
}): Promise<{ summary: string; usedLLM: boolean; llmError?: string | undefined }> {
  const { regionName, catName, maxAge, style, language, uiLocale, lengthPreset, lengthConfig, contextLines, requestLog } = params;

  const llmCacheKey = 'gemini_quota';
  const now = Date.now();
  const negativeExpire = cacheManager.getNegativeCache(llmCacheKey) || 0;
  let summary = '';
  let payloadErrorForLogs: string | undefined;
  let usedLLM = true;

  if (process.env.SERVER_DISABLE_LLM === 'true' || negativeExpire > now) {
    usedLLM = false;
    const fallbackLines = (contextLines || []).slice(0, Math.max(3, Math.min(Math.round(Math.min(lengthConfig.bulletsMax, Math.max(lengthConfig.bulletsMin, 6))), 6))).map((l) => `- ${l.split('\n')[0]}`);
    summary = `TL;DR: LLM unavailable or temporarily disabled. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
  } else {
    const summaryTimer = requestLog.startTimer('summary generation', { region: regionName, category: catName, style, usedLLM: true });
    try {
      const res = await summarizeWithLLM({ regionName, catName, maxAge, style, language, uiLocale, lengthPreset, lengthConfig, contextLines });
      summary = res.summary;
      if (res.llmError) payloadErrorForLogs = res.llmError;
    } finally {
      summaryTimer();
    }
  }

  return { summary, usedLLM, llmError: payloadErrorForLogs };
}

import { buildPrompt, generateSummary, GEMINI_MODEL, getModel, type LengthConfig } from './llm';
import logger from './logger';
import { dedupeSummaryBullets } from './utils';

export async function summarizeWithLLM(opts: {
  regionName: string;
  catName: string;
  maxAge: number;
  style: string;
  language: string;
  uiLocale: string;
  lengthPreset: string;
  lengthConfig: LengthConfig;
  contextLines: string[];
}): Promise<{ summary: string; llmError?: string }> {
  const { regionName, catName, maxAge, style, language, uiLocale, lengthPreset, lengthConfig, contextLines } = opts;
  if (!getModel()) throw new Error('GEMINI_API_KEY missing');
  const suggestedBullets = Math.round(Math.min(lengthConfig.bulletsMax, Math.max(lengthConfig.bulletsMin, 6)));
  const prompt = buildPrompt({ regionName, catName, maxAge, style, language, uiLocale, lengthPreset, lengthConfig, contextLines }).replace(/Then provide .* bulleted key takeaways/, `Then provide ${suggestedBullets} bulleted key takeaways`);
  const stopLLM = logger.startTimer('llm generate', { model: GEMINI_MODEL, style, bullets: suggestedBullets });
  let summary: string = '';
  let payloadErrorForLogs: string | undefined;

  // Retry loop with exponential backoff + jitter. If the Gemini API returns a
  // retry hint (e.g. "Please retry in 56s" or a RetryInfo object in the message),
  // honor that when possible. After exhausting attempts, fall back to a simple
  // extractive summary built from the top context lines.
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      summary = await generateSummary({ prompt, style });
      // success
      payloadErrorForLogs = undefined;
      break;
    } catch (err: any) {
      const msg = err?.message || String(err);
      payloadErrorForLogs = msg;
      // If this looks like a quota / Too Many Requests error, don't retry —
      // retries will only waste more quota and cause extra function invocations.
      const isQuota = /quota|too many requests|429/i.test(msg);
      if (isQuota) {
        logger.warn('LLM quota error detected; aborting retries', { attempt, message: msg });
        break;
      }
      // If this was the last attempt, we'll break out and perform fallback below.
      if (attempt >= maxAttempts) {
        logger.error('LLM generation failed after retries', { attempt, maxAttempts, message: msg });
        break;
      }

      // Try to parse an explicit retry delay from the error text (e.g. "Please retry in 56s" or "retryDelay":"56s").
      let waitMs: number | null = null;
      try {
        const m = msg.match(/retry in\s*(\d+(?:\.\d+)?)s/i) || msg.match(/retryDelay"\s*:\s*"?(\d+(?:\.\d+)?)s/i);
        if (m && m[1]) {
          const secs = parseFloat(m[1]);
          if (!Number.isNaN(secs) && secs > 0) waitMs = Math.ceil(secs * 1000 + 250); // small padding
        }
      } catch (_) { /* ignore parse errors */ }

      // If no explicit hint, use exponential backoff with jitter.
      if (waitMs === null) {
        const base = 500 * Math.pow(2, attempt - 1); // 500ms, 1s, 2s
        const jitter = Math.floor(Math.random() * 500); // up to 500ms
        waitMs = base + jitter;
      }

      logger.warn('LLM attempt failed - retrying after backoff', { attempt, waitMs, message: msg });
      await new Promise((r) => setTimeout(r, waitMs));
      // continue loop to retry
    }
  }

  // If summary still falsy after retries, build a conservative extractive fallback.
  if (!summary || !summary.trim()) {
    const fallbackLines = (contextLines || []).slice(0, Math.max(3, Math.min(suggestedBullets, 6))).map((l) => `- ${l.split('\n')[0]}`);
    summary = `TL;DR: LLM generation failed or timed out. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
  }

  stopLLM();
  // Skip deduplication for new format
  // summary = dedupeSummaryBullets(summary);
  return { summary, llmError: payloadErrorForLogs };
}

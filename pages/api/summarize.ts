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
  let summary: string;
  let payloadErrorForLogs: string | undefined;
  try {
    summary = await generateSummary({ prompt, style });
  } catch (firstErr: any) {
    logger.warn('LLM first attempt failed or timed out, will retry once', { message: firstErr?.message || String(firstErr) });
    try {
      summary = await generateSummary({ prompt, style });
    } catch (secondErr: any) {
      logger.error('LLM generation failed or timed out after retry', { first: firstErr?.message || String(firstErr), second: secondErr?.message || String(secondErr) });
      const fallbackLines = (contextLines || []).slice(0, 5).map((l) => `- ${l.split('\n')[0]}`);
      summary = `TL;DR: LLM generation failed or timed out. Showing top headlines instead:\n\n${fallbackLines.join('\n\n')}`;
      payloadErrorForLogs = (secondErr?.message || firstErr?.message || String(secondErr || firstErr));
    }
  } finally {
    stopLLM();
  }
  summary = dedupeSummaryBullets(summary);
  return { summary, llmError: payloadErrorForLogs };
}

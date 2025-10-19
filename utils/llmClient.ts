import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { LengthConfig, BuildPromptParams } from './llmPrompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

let model: GenerativeModel | null = null;

export function getModel(): GenerativeModel | null {
  if (!model && GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  }
  return model;
}

export async function generateSummary({ prompt, style }: { prompt: string; style: string }): Promise<string> {
  const mdl = getModel();
  if (!mdl) {
    const err = new Error("GEMINI_API_KEY missing. Configure it in Vercel Project Settings > Environment Variables.") as Error & { code: string };
    err.code = 'NO_MODEL';
    throw err;
  }
  const temp = (style === 'headlines-only' || style === 'urgent-brief') ? 0.3 : 0.5;
  const generationConfig = { temperature: temp, topP: 0.9 };
  const result = await mdl.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { ...generationConfig, maxOutputTokens: 1500 }
  });
  try {
    const text = result?.response?.text?.() || "";
    let trimmed = (text || "").trim();
    if (!trimmed) {
      throw new Error('LLM returned an empty text response. Check GEMINI_API_KEY, model name, and quota/permissions.');
    }
    const terminators = ['.', '!', '?', '。', '！', '？', '…'];
    const lastChar = trimmed.charAt(trimmed.length - 1);
    if (!terminators.includes(lastChar)) {
      const lastIdx = Math.max(
        trimmed.lastIndexOf('.'),
        trimmed.lastIndexOf('!'),
        trimmed.lastIndexOf('?'),
        trimmed.lastIndexOf('。'),
        trimmed.lastIndexOf('！'),
        trimmed.lastIndexOf('？'),
        trimmed.lastIndexOf('…')
      );
      if (lastIdx > -1) {
        trimmed = trimmed.slice(0, lastIdx + 1).trim();
      }
    }
    return trimmed;
  } catch (err: any) {
    throw new Error(err?.message || 'LLM generation failed with an unknown error');
  }
}

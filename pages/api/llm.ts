import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

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

export interface LengthConfig {
  tldrSentences: string;
  bulletsMin: number;
  bulletsMax: number;
}

export interface BuildPromptParams {
  regionName: string;
  catName: string;
  maxAge: number;
  style: string;
  language: string;
  uiLocale: string;
  lengthPreset: string;
  lengthConfig: LengthConfig;
  contextLines: string[];
}

export interface GenerateSummaryParams {
  prompt: string;
  style: string;
}

const styleDirectives: { [key: string]: string } = {
  neutral: "Neutral, factual tone. Keep it concise and balanced.",
  "concise-bullets": "Concise bullets. One-liners where possible.",
  casual: "Conversational and friendly tone. Avoid jargon.",
  "headlines-only": "Headlines only (one line each). No extra commentary.",
  analytical: "Analytical. Mention implications, context, risks, and what's next.",
  "executive-brief":
    "Executive brief. 5-8 bullets: What happened, why it matters, key details, context, what's next.",
  snarky:
    "Witty, slightly sarcastic tone without being rude. Keep it sharp and readable.",
  optimistic:
    "Upbeat, constructive tone. Emphasize positive outcomes and opportunities while staying factual.",
  skeptical:
    "Question underlying assumptions. Highlight caveats, limitations, and missing information without being dismissive.",
  storyteller:
    "Narrative tone. Smooth transitions, light color, and a sense of progression while remaining tight and factual.",
  "dry-humor":
    "Deadpan, subtle humor. No slapstick, keep it understated and professional.",
  "urgent-brief":
    "Time-critical tone. Short sentences, immediate takeaways and action-oriented phrasing.",
  "market-analyst":
    "Professional market commentary. Include drivers, numbers where available, and likely implications for markets or businesses.",
  doomer:
    "Sober, pessimistic vibe. Emphasize risks, downsides, and long-term headwinds—but stay respectful and factual; no nihilism or personal attacks.",
  "4chan-user":
    "a 4chan user with meme phrasing and irony. Dont get overly edgy.",
  uzkalnis:
    "Opinionated Lithuanian columnist vibe: assertive, witty, and metaphor-rich while remaining respectful. Critique ideas, not people.",
  "piktas-delfio-komentatorius":
    "Ironic 'angry commenter' tone: blunt and punchy, highlighting frustrations and contradictions without insults, hate, or profanity."
};

export function buildPrompt({ regionName, catName, maxAge, style, language, uiLocale, lengthPreset, lengthConfig, contextLines }: BuildPromptParams): string {
  const styleNote = styleDirectives[style] || styleDirectives.neutral;

  const base = `You are a precise news summarizer. Summarize the most important developments for:
- Region: ${regionName}
- Category: ${catName}
- Time window: last ${maxAge} hours
- Desired style: ${style}
- Language: ${language} (locale: ${uiLocale})
- Desired length: ${lengthPreset}

Constraints:
- Output in ${language}. Use Markdown. Do NOT include code fences.
- Use locale-aware conventions for this locale (${uiLocale}): spelling, idioms where safe, dates in the examples already provided, and currency/number formatting if needed.
- Start with a ${lengthConfig.tldrSentences} TL;DR.
- Then provide exactly ${lengthConfig.bulletsMax} bulleted key takeaways (each with a short 1–2 sentence expansion; keep bullets crisp for short length, add slightly more context for long length). If there are fewer clearly distinct stories, split key developments into distinct angles (e.g., policy decision, market reaction, international response, domestic politics) to reach the requested bullet count while avoiding repetition.
- Where relevant, include a Markdown link to ONE representative source in each bullet using the links provided.
- Format links with concise labels: use the source name or domain (e.g., [Reuters](...)), not the raw URL as link text.
- Do NOT repeat the same story: each bullet must cover a distinct development; if multiple sources report the same event, merge into one bullet.
- If there is "no news" for a focus (e.g., selected region/language), state that ONCE only; do not repeat similar "no updates" bullets.
- Avoid speculation and sensationalism.
- Keep it respectful: no slurs, hate speech, harassment, or explicit content.
- If a story is local to Lithuania and region is Lithuania, prioritize it.

Style directive:
${styleNote}

Articles to consider:
${contextLines.join("\n\n")}`;

  return base + "\n\nImportant: Apply the chosen style consistently across the entire output — the TL;DR opener, every bullet headline, and each bullet's 1-2 sentence expansion must reflect the requested style and tone. Produce exactly the requested number of bullets — do not produce fewer than requested. If the style is `headlines-only`, produce only single-line headlines (one per bullet) with no expansions. If the style uses a special voice (e.g., 'snarky' or 'uzkalnis'), apply that voice to every bullet and expansion while staying within the other constraints.";
}

export async function generateSummary({ prompt, style }: GenerateSummaryParams): Promise<string> {
  const mdl = getModel();
  if (!mdl) {
    const err = new Error("GEMINI_API_KEY missing. Configure it in Vercel Project Settings > Environment Variables.") as Error & { code: string };
    err.code = 'NO_MODEL';
    throw err;
  }
  const temp = (style === 'headlines-only' || style === 'urgent-brief') ? 0.3 : 0.5;
  const generationConfig = { temperature: temp, topP: 0.9 };
  // Increase max output tokens to reduce mid-sentence truncation. 1500 is generous but
  // still bounded; adjust if you need even longer summaries.
  const result = await mdl.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { ...generationConfig, maxOutputTokens: 1500 }
  });
  try {
    const text = result?.response?.text?.() || "";
    let trimmed = (text || "").trim();
    if (!trimmed) {
      // Surface a clearer error to the caller instead of returning a silent placeholder.
      throw new Error('LLM returned an empty text response. Check GEMINI_API_KEY, model name, and quota/permissions.');
    }
    // If the model appears to have been cut off mid-sentence (no sentence-ending punctuation
    // at the end), try to trim the output to the last full sentence to avoid awkward truncation.
    // We look for common sentence terminators and cut at the last one if present.
    const terminators = ['.', '!', '?', '。', '！', '？', '…'];
    const lastChar = trimmed.charAt(trimmed.length - 1);
    if (!terminators.includes(lastChar)) {
      // Find last occurrence of sentence-ending punctuation
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
        // Only trim if there's at least some sentence boundary found; otherwise keep original.
        trimmed = trimmed.slice(0, lastIdx + 1).trim();
      }
    }
    return trimmed;
  } catch (err: any) {
    // Re-throw to allow upstream handler to log and fallback appropriately.
    throw new Error(err?.message || 'LLM generation failed with an unknown error');
  }
}
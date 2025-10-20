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

export const styleDirectives: { [key: string]: string } = {
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

  const base = `Summarize key news developments for ${regionName} ${catName} in the last ${maxAge} hours.

For each article, use this exact format:
TL;DR: [brief summary of this specific article]

[Article title/caption]

[Detailed summary of this article]

![image](image_url_if_available)

Source: [source_name](source_url)

---

Repeat this format for each of the ${lengthConfig.bulletsMax} most important articles.

Output in ${language} (${uiLocale} locale). Use Markdown.
- Style: ${styleNote}
- Avoid repetition, speculation, sensationalism
- Respectful tone only
- Include images where available in the articles

Articles to summarize:
${contextLines.join("\n\n")}

Apply style consistently across all summaries.`;

  return base;
}

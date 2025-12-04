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

IMPORTANT: Start with a main TL;DR that summarizes all the key developments across the articles. Then provide a separate summary for each of the ${lengthConfig.bulletsMax} most important articles. For each article, use this exact format and preserve the provided metadata lines (Source and Link):

**article_title**

[Detailed summary paragraph of this article - at least 2-3 sentences explaining what happened, why it matters, and key details]

![image](image_url_if_available)

[<source>](<url>)

---

CRITICAL REQUIREMENTS:
- Do NOT combine articles into a single summary. Each article MUST have its own section.
- Each article summary MUST be at least 2-3 sentences long. Do NOT write one-sentence summaries.
- Include ALL ${lengthConfig.bulletsMax} articles. Do NOT skip or truncate the last articles.
- If an article has an image URL in the context, ALWAYS include it using the ![title](url) format.
- Give equal attention and detail to ALL articles, including the last one.

CRITICAL LINKING RULES (follow exactly):
- For each article, use the metadata in the context block:
  - The text after "Source:" is the source/host (example: "theguardian.com").
  - The text after "Link:" is the full article URL (example: "https://www.theguardian.com/.../full-article-path").
- In the line [<source>](<url>):
  - Set <source> to the value from the "Source:" line (hostname only).
  - Set <url> to the value from the "Link:" line (the exact article URL, unchanged).
- Do NOT replace the article URL with a homepage or different URL (no "https://www.theguardian.com" if the Link line has a longer article path).
- Do NOT invent or rewrite URLs; always copy them exactly from the Link metadata line.

Do not add extra information like dates, authors, or publication details unless they are part of the title or summary.

Output in ${language} (${uiLocale} locale). Use Markdown.
- Style: ${styleNote}
- Avoid repetition, speculation, sensationalism
- Respectful tone only
- Include images where available in the articles
- Use the article titles exactly as provided in the context

Articles to summarize:
${contextLines.join("\n\n")}

Apply style consistently across all individual article summaries. Remember: each article deserves equal detail.`;

  return base;
}

export { getModel, generateSummary, GEMINI_MODEL } from '@/utils/llmClient';
export { buildPrompt } from '@/utils/llmPrompts';
export type { BuildPromptParams, LengthConfig } from '@/utils/llmPrompts';
export default (_req: any, res: any) => res.status(404).end();

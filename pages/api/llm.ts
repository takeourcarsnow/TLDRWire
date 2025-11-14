import { getModel, generateSummary, GEMINI_MODEL } from '../../app/utils/llmClient';
import { buildPrompt } from '../../app/utils/llmPrompts';
import type { BuildPromptParams, LengthConfig } from '../../app/utils/llmPrompts';

export { getModel, generateSummary, GEMINI_MODEL, buildPrompt };
export type { BuildPromptParams, LengthConfig };
export default (_req: any, res: any) => res.status(404).end();

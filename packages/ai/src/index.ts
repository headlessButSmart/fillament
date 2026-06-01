export { FillamentAI } from "./FillamentAI.js";
export type { FillamentAIProps } from "./FillamentAI.js";

export { useAIAssist, DEFAULT_MODEL } from "./useAIAssist.js";
export type { UseAIAssistResult } from "./useAIAssist.js";

export {
  buildChatMessages,
  extractJsonObject,
  redactValues,
  isSensitive,
  DEFAULT_SYSTEM_PROMPT,
} from "./prompt.js";
export type { ChatMessage, BuildPromptInput } from "./prompt.js";

export { resolveSchema, relaxSchemaForPartialUpdate } from "./schema.js";

export { getOrCreateEngine, chatComplete } from "./engine.js";
export type { EngineHandle, ChatCallOptions } from "./engine.js";

export type {
  AIAssistOptions,
  AIAssistStatus,
  AIFieldDescription,
  AIModelParams,
  AIProgressReport,
  AISchemaInput,
  AISuggestion,
} from "./types.js";

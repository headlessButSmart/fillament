export { webmcpPlugin, registerFormWithWebMCP } from "./plugin.js";
export { buildFormTools } from "./tools.js";
export { createModelContextRegistrar, isModelContextAvailable } from "./native.js";
export { relaxForPartialUpdate, flattenPatch, sanitizeToolName } from "./schema.js";
export { defaultIsSensitivePath } from "./redact.js";

export type {
  WebMCPOptions,
  WebMCPExposeOptions,
  WebMCPTool,
  WebMCPToolResult,
  ToolRegistrar,
} from "./types.js";

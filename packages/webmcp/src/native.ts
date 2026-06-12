// Registrar for the W3C Web Model Context API (`navigator.modelContext`).
// The API is an early-stage proposal — when it is unavailable, registration is
// a silent no-op so apps can ship the plugin unconditionally.
import type { ToolRegistrar, WebMCPTool } from "./types.js";

type ModelContextToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

type ModelContextLike = {
  registerTool?: (tool: ModelContextToolDescriptor) => unknown;
  provideContext?: (context: { tools: ModelContextToolDescriptor[] }) => void;
};

function getModelContext(): ModelContextLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  const candidate = (navigator as { modelContext?: unknown }).modelContext;
  return candidate && typeof candidate === "object" ? (candidate as ModelContextLike) : undefined;
}

/** True when the browser exposes `navigator.modelContext`. */
export function isModelContextAvailable(): boolean {
  return getModelContext() !== undefined;
}

function toDescriptor(tool: WebMCPTool): ModelContextToolDescriptor {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: (args) => tool.execute(args ?? {}),
  };
}

// Tools registered through the provideContext fallback. provideContext replaces
// the page's full tool set on every call, so we keep the set and re-provide it.
const providedTools = new Map<string, ModelContextToolDescriptor>();

function reprovide(modelContext: ModelContextLike): void {
  modelContext.provideContext?.({ tools: Array.from(providedTools.values()) });
}

/**
 * A ToolRegistrar backed by `navigator.modelContext`. Prefers the incremental
 * `registerTool()` API and falls back to `provideContext()` (replacing the
 * whole tool set) on older drafts. No-ops when the API is missing.
 */
export function createModelContextRegistrar(): ToolRegistrar {
  return {
    register(tool: WebMCPTool): () => void {
      const modelContext = getModelContext();
      if (!modelContext) return () => {};

      if (typeof modelContext.registerTool === "function") {
        const registration = modelContext.registerTool(toDescriptor(tool));
        return () => {
          const handle = registration as { unregister?: () => void } | undefined;
          handle?.unregister?.();
        };
      }

      if (typeof modelContext.provideContext === "function") {
        providedTools.set(tool.name, toDescriptor(tool));
        reprovide(modelContext);
        return () => {
          providedTools.delete(tool.name);
          reprovide(modelContext);
        };
      }

      return () => {};
    },
  };
}

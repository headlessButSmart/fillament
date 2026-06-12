import { describe, it, expect, afterEach } from "vitest";
import { createModelContextRegistrar, isModelContextAvailable } from "../native.js";
import type { WebMCPTool } from "../types.js";

const tool = (name: string): WebMCPTool => ({
  name,
  description: "test tool",
  inputSchema: { type: "object", properties: {} },
  execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
});

function setModelContext(value: unknown): void {
  Object.defineProperty(navigator, "modelContext", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setModelContext(undefined);
});

describe("createModelContextRegistrar", () => {
  it("no-ops when navigator.modelContext is missing", () => {
    expect(isModelContextAvailable()).toBe(false);
    const registrar = createModelContextRegistrar();
    const unregister = registrar.register(tool("a"));
    expect(() => unregister()).not.toThrow();
  });

  it("uses registerTool and its unregister handle when available", () => {
    const registered: string[] = [];
    let unregistered = 0;
    setModelContext({
      registerTool: (descriptor: { name: string }) => {
        registered.push(descriptor.name);
        return { unregister: () => (unregistered += 1) };
      },
    });
    expect(isModelContextAvailable()).toBe(true);
    const registrar = createModelContextRegistrar();
    const unregister = registrar.register(tool("form_fill"));
    expect(registered).toEqual(["form_fill"]);
    unregister();
    expect(unregistered).toBe(1);
  });

  it("falls back to provideContext, replacing the full tool set", () => {
    const calls: Array<string[]> = [];
    setModelContext({
      provideContext: (context: { tools: Array<{ name: string }> }) => {
        calls.push(context.tools.map((t) => t.name));
      },
    });
    const registrar = createModelContextRegistrar();
    const unregisterA = registrar.register(tool("a"));
    registrar.register(tool("b"));
    expect(calls.at(-1)).toEqual(["a", "b"]);
    unregisterA();
    expect(calls.at(-1)).toEqual(["b"]);
  });
});

import { describe, it, expect } from "vitest";
import { createMcpBRegistrar, type McpBModules } from "../mcp-b.js";
import type { WebMCPTool } from "../types.js";

// Fake MCP SDK + transport that capture handlers so we can drive list/call.
function createFakeModules() {
  const state = {
    handlers: new Map<unknown, (request: any) => any>(),
    listChanged: 0,
    connected: false,
    closed: false,
    serverInfo: undefined as { name: string; version: string } | undefined,
    transportOptions: undefined as { allowedOrigins: string[] } | undefined,
  };
  const ListToolsRequestSchema = Symbol("listTools");
  const CallToolRequestSchema = Symbol("callTool");

  class FakeServer {
    constructor(info: { name: string; version: string }) {
      state.serverInfo = info;
    }
    setRequestHandler(schema: unknown, handler: (request: any) => any) {
      state.handlers.set(schema, handler);
    }
    async connect() {
      state.connected = true;
    }
    async close() {
      state.closed = true;
    }
    sendToolListChanged() {
      state.listChanged += 1;
    }
  }

  class FakeTransport {
    constructor(options: { allowedOrigins: string[] }) {
      state.transportOptions = options;
    }
  }

  const modules: McpBModules = {
    Server: FakeServer as unknown as McpBModules["Server"],
    ListToolsRequestSchema,
    CallToolRequestSchema,
    TabServerTransport: FakeTransport as unknown as McpBModules["TabServerTransport"],
  };
  return {
    modules,
    state,
    listTools: () => state.handlers.get(ListToolsRequestSchema)!({}),
    callTool: (name: string, args: Record<string, unknown>) =>
      state.handlers.get(CallToolRequestSchema)!({ params: { name, arguments: args } }),
  };
}

const echoTool: WebMCPTool = {
  name: "form_fill",
  description: "fill",
  inputSchema: { type: "object", properties: { email: { type: "string" } } },
  execute: async (args) => ({ content: [{ type: "text", text: JSON.stringify(args) }] }),
};

describe("createMcpBRegistrar", () => {
  it("connects an in-page server and serves tools/list + tools/call", async () => {
    const fake = createFakeModules();
    const registrar = await createMcpBRegistrar({ name: "test-app", modules: fake.modules });
    expect(fake.state.connected).toBe(true);
    expect(fake.state.serverInfo?.name).toBe("test-app");
    expect(fake.state.transportOptions?.allowedOrigins).toEqual(["*"]);

    registrar.register(echoTool);
    expect(fake.state.listChanged).toBe(1);

    const listed = await fake.listTools();
    expect(listed.tools).toEqual([
      { name: "form_fill", description: "fill", inputSchema: echoTool.inputSchema },
    ]);

    const result = await fake.callTool("form_fill", { email: "a@b.com" });
    expect(result.content[0].text).toBe('{"email":"a@b.com"}');
  });

  it("returns isError for unknown tools and after unregistration", async () => {
    const fake = createFakeModules();
    const registrar = await createMcpBRegistrar({ modules: fake.modules });
    const unregister = registrar.register(echoTool);
    unregister();
    expect((await fake.listTools()).tools).toEqual([]);
    const result = await fake.callTool("form_fill", {});
    expect(result.isError).toBe(true);
  });

  it("wraps tool exceptions as isError results", async () => {
    const fake = createFakeModules();
    const registrar = await createMcpBRegistrar({ modules: fake.modules });
    registrar.register({
      ...echoTool,
      name: "boom",
      execute: async () => {
        throw new Error("kaput");
      },
    });
    const result = await fake.callTool("boom", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("kaput");
  });

  it("close() shuts the server down", async () => {
    const fake = createFakeModules();
    const registrar = await createMcpBRegistrar({ modules: fake.modules });
    await registrar.close();
    expect(fake.state.closed).toBe(true);
  });
});

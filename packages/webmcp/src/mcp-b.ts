// Bridge for today's browsers: runs a real MCP server inside the page over
// @mcp-b/transports' tab transport, so any MCP client connected through the
// WebMCP/MCP-B browser extension can call the form tools right now.
//
// Both `@modelcontextprotocol/sdk` and `@mcp-b/transports` are OPTIONAL peer
// dependencies, loaded lazily — apps that only use the main entry never pay
// for them.
import type { ToolRegistrar, WebMCPTool } from "./types.js";

export type McpBRegistrarOptions = {
  // MCP server identity announced to clients. Defaults to the page's hostname.
  name?: string;
  version?: string;
  // Origins allowed to connect to the tab transport. Defaults to ["*"];
  // restrict this in production.
  allowedOrigins?: string[];
  // Test/DI seam — inject the modules instead of dynamic-importing them.
  modules?: McpBModules;
};

export type McpBRegistrarHandle = ToolRegistrar & {
  // Disconnect the in-page MCP server.
  close: () => Promise<void>;
};

// Minimal structural types for the bits of the MCP SDK we touch — keeps the
// package compilable without the optional dependency installed.
type McpServerLike = {
  connect: (transport: unknown) => Promise<void>;
  close: () => Promise<void>;
  setRequestHandler: (schema: unknown, handler: (request: any) => any) => void;
  sendToolListChanged: () => void;
};

export type McpBModules = {
  Server: new (info: { name: string; version: string }, options: { capabilities: Record<string, unknown> }) => McpServerLike;
  ListToolsRequestSchema: unknown;
  CallToolRequestSchema: unknown;
  TabServerTransport: new (options: { allowedOrigins: string[] }) => unknown;
};

async function loadModules(): Promise<McpBModules> {
  const sdkServerPath = "@modelcontextprotocol/sdk/server/index.js";
  const sdkTypesPath = "@modelcontextprotocol/sdk/types.js";
  const transportsPath = "@mcp-b/transports";
  let serverModule: any;
  let typesModule: any;
  let transportsModule: any;
  try {
    [serverModule, typesModule, transportsModule] = await Promise.all([
      import(/* @vite-ignore */ sdkServerPath),
      import(/* @vite-ignore */ sdkTypesPath),
      import(/* @vite-ignore */ transportsPath),
    ]);
  } catch (err) {
    throw new Error(
      `[fillament/webmcp] The "./mcp-b" registrar needs the optional peer dependencies ` +
        `"@modelcontextprotocol/sdk" and "@mcp-b/transports" to be installed. (${String(err)})`
    );
  }
  return {
    Server: serverModule.Server,
    ListToolsRequestSchema: typesModule.ListToolsRequestSchema,
    CallToolRequestSchema: typesModule.CallToolRequestSchema,
    TabServerTransport: transportsModule.TabServerTransport,
  };
}

/**
 * Create a ToolRegistrar backed by an in-page MCP server over the MCP-B tab
 * transport. Create one per page and pass it to `webmcpPlugin({ registrar })`
 * for every form you want to expose:
 *
 *   const registrar = await createMcpBRegistrar({ name: "my-app" });
 *   const form = createForm({ plugins: [webmcpPlugin({ registrar })] });
 *
 * Call `registrar.close()` on page teardown.
 */
export async function createMcpBRegistrar(
  options: McpBRegistrarOptions = {}
): Promise<McpBRegistrarHandle> {
  const modules = options.modules ?? (await loadModules());
  const { Server, ListToolsRequestSchema, CallToolRequestSchema, TabServerTransport } = modules;

  const name =
    options.name ??
    (typeof location !== "undefined" && location.hostname ? location.hostname : "fillament-forms");
  const server = new Server(
    { name, version: options.version ?? "1.0.0" },
    { capabilities: { tools: { listChanged: true } } }
  );

  const tools = new Map<string, WebMCPTool>();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Array.from(tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const toolName: string = request?.params?.name;
    const tool = tools.get(toolName);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }
    try {
      return await tool.execute((request?.params?.arguments as Record<string, unknown>) ?? {});
    } catch (err) {
      return { content: [{ type: "text", text: String(err) }], isError: true };
    }
  });

  await server.connect(new TabServerTransport({ allowedOrigins: options.allowedOrigins ?? ["*"] }));

  return {
    register(tool: WebMCPTool): () => void {
      tools.set(tool.name, tool);
      server.sendToolListChanged();
      return () => {
        if (tools.get(tool.name) === tool) {
          tools.delete(tool.name);
          server.sendToolListChanged();
        }
      };
    },
    close: () => server.close(),
  };
}

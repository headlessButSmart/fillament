// Neutral tool-registration seam. The plugin core registers tools against this
// interface; the main entry wires it to `navigator.modelContext` and the
// "./mcp-b" entry wires it to an in-page MCP server over @mcp-b/transports.

export type WebMCPToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type WebMCPTool = {
  // MCP tool name: [a-zA-Z0-9_-], unique per registrar.
  name: string;
  description: string;
  // JSON Schema for the tool arguments.
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<WebMCPToolResult>;
};

export type ToolRegistrar = {
  // Returns an unregister function.
  register: (tool: WebMCPTool) => () => void;
};

export type WebMCPExposeOptions = {
  // Tool that returns values + errors + validity. Default: true.
  read?: boolean;
  // Tool that patches values and reports validation results. Default: true.
  fill?: boolean;
  // Tool that submits the form. Default: false — submitting on behalf of the
  // user is the risky half; opt in deliberately.
  submit?: boolean;
};

export type WebMCPOptions<TValues = unknown> = {
  // Prefix for tool names (sanitized). Defaults to the form id.
  name?: string;
  // Human description of what this form does — shown to the agent on every
  // tool. Strongly recommended; form ids alone mean little to an agent.
  description?: string;
  expose?: WebMCPExposeOptions;
  // Called before an agent-initiated submit; return false (or throw) to block.
  // Use this to show a confirmation UI to the user.
  confirmSubmit?: (values: TValues) => boolean | Promise<boolean>;
  // Paths whose values are hidden from `get_state` results. Merged with the
  // built-in sensitive patterns (password, token, card, cvv, ssn, secret).
  // Pass a predicate for full control.
  redact?: string[] | ((path: string) => boolean);
  // Where tools are registered. Defaults to the W3C `navigator.modelContext`
  // registrar (a no-op when the API is unavailable). Pass the registrar from
  // "@fillament/webmcp/mcp-b" to serve agents over @mcp-b/transports today.
  registrar?: ToolRegistrar;
};

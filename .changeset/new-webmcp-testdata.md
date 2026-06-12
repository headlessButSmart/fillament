---
"@fillament/webmcp": minor
"@fillament/test-data": minor
---

Initial release of two new optional modules.

- **@fillament/webmcp**: expose forms to in-browser AI agents as WebMCP/MCP tools derived from the validation schema. `webmcpPlugin()` registers `_get_state`, `_fill`, and (opt-in, off by default) `_submit` tools; sensitive values are redacted from reads and `confirmSubmit` puts a human in the loop. Main entry targets the W3C `navigator.modelContext` API (no-op where missing); the `@fillament/webmcp/mcp-b` entry runs an in-page MCP server over `@mcp-b/transports` for today's browsers (optional peer deps, dynamic import).
- **@fillament/test-data**: deterministic, schema-derived test data. `fillFormWithTestData(form, { seed, overrides, onlyEmpty, includeOptional })` and the pure `generateTestValues(jsonSchema, options)` — formats, enums, and bounds respected, property-name heuristics for the rest, no faker dependency. The `@fillament/test-data/devtools` entry adds a one-click 🎲 fill button to the DevTools panel.

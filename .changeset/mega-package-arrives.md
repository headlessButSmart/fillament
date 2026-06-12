---
"@fillament/mega": minor
---

New `@fillament/mega` package — everything Fillament in one install, batteries included. All 16 packages are re-exported behind tree-shakable subpath entries (`@fillament/mega/zod`, `/persist`, `/webmcp/mcp-b`, `/blueprints/auth`, …), with the root entry combining core + React bindings. Zod, Yup, AJV, `@mlc-ai/web-llm`, and the MCP bridge ship as regular dependencies, so nothing needs a manual install; `react` / `react-dom` stay required peers (auto-installed by npm 7+ / pnpm 8+) to guarantee a single React instance.

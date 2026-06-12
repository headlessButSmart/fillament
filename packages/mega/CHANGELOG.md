# @fillament/mega

## 0.2.0

### Minor Changes

- [#3](https://github.com/headlessButSmart/fillament/pull/3) [`a70e851`](https://github.com/headlessButSmart/fillament/commit/a70e851d17656f8774dc6abbe5b4f62b4ff87640) Thanks [@headlessButSmart](https://github.com/headlessButSmart)! - New `@fillament/mega` package — everything Fillament in one install, batteries included. All 16 packages are re-exported behind tree-shakable subpath entries (`@fillament/mega/zod`, `/persist`, `/webmcp/mcp-b`, `/blueprints/auth`, …), with the root entry combining core + React bindings. Zod, Yup, AJV, `@mlc-ai/web-llm`, and the MCP bridge ship as regular dependencies, so nothing needs a manual install; `react` / `react-dom` stay required peers (auto-installed by npm 7+ / pnpm 8+) to guarantee a single React instance.

### Patch Changes

- Updated dependencies [[`a70e851`](https://github.com/headlessButSmart/fillament/commit/a70e851d17656f8774dc6abbe5b4f62b4ff87640), [`a70e851`](https://github.com/headlessButSmart/fillament/commit/a70e851d17656f8774dc6abbe5b4f62b4ff87640)]:
  - @fillament/webmcp@1.0.0
  - @fillament/test-data@1.0.0
  - @fillament/core@0.3.0
  - @fillament/zod@0.3.0
  - @fillament/yup@0.3.0
  - @fillament/json-schema@0.3.0
  - @fillament/devtools@0.3.0
  - @fillament/ai@0.2.1
  - @fillament/analytics@0.3.0
  - @fillament/blueprints@2.0.0
  - @fillament/formik-compat@0.3.0
  - @fillament/i18n@2.0.0
  - @fillament/persist@2.0.0
  - @fillament/react@0.3.0
  - @fillament/redux@2.0.0
  - @fillament/remote@2.0.0

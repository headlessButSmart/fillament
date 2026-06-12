# @fillament/json-schema

## 0.3.0

### Minor Changes

- [#3](https://github.com/headlessButSmart/fillament/pull/3) [`a70e851`](https://github.com/headlessButSmart/fillament/commit/a70e851d17656f8774dc6abbe5b4f62b4ff87640) Thanks [@headlessButSmart](https://github.com/headlessButSmart)! - Schema introspection + DevTools action toolbar.

  - **core**: `ValidationAdapter` gains an optional, additive `introspect(): JsonSchema` method. New helpers `introspectForm(form)` (adapter introspection with value-inference fallback) and `inferJsonSchemaFromValues(values)`.
  - **zod**: `zodAdapter` implements `introspect()`; new `zodToJsonSchema(schema)` export (structural walker, no runtime zod dependency).
  - **yup**: `yupAdapter` implements `introspect()`; new `yupToJsonSchema(schema)` export built on `schema.describe()`.
  - **json-schema**: `jsonSchemaAdapter` implements `introspect()` (returns the schema verbatim).
  - **devtools**: new action registry — `registerDevtoolsAction({ id, label, title?, run(form) })`, `listDevtoolsActions()`, `subscribeDevtoolsActions()` — rendered as a toolbar in `<FillamentDevTools />`. Used by `@fillament/test-data` for its one-click fill button.

### Patch Changes

- Updated dependencies [[`a70e851`](https://github.com/headlessButSmart/fillament/commit/a70e851d17656f8774dc6abbe5b4f62b4ff87640)]:
  - @fillament/core@0.3.0

## 0.2.0

### Minor Changes

- [`6f9db2e`](https://github.com/headlessButSmart/fillament/commit/6f9db2e4b0d14fbe3606d8555d99248594eb8b21) Thanks [@hellorierino](https://github.com/hellorierino)! - Initial public release: type-safe forms, free DevTools, privacy-safe analytics, drop-in Formik compat, JSON-driven layouts, FieldArrayTable, in-browser AI fill.

### Patch Changes

- Updated dependencies [[`6f9db2e`](https://github.com/headlessButSmart/fillament/commit/6f9db2e4b0d14fbe3606d8555d99248594eb8b21)]:
  - @fillament/core@0.2.0

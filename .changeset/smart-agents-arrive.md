---
"@fillament/core": minor
"@fillament/zod": minor
"@fillament/yup": minor
"@fillament/json-schema": minor
"@fillament/devtools": minor
---

Schema introspection + DevTools action toolbar.

- **core**: `ValidationAdapter` gains an optional, additive `introspect(): JsonSchema` method. New helpers `introspectForm(form)` (adapter introspection with value-inference fallback) and `inferJsonSchemaFromValues(values)`.
- **zod**: `zodAdapter` implements `introspect()`; new `zodToJsonSchema(schema)` export (structural walker, no runtime zod dependency).
- **yup**: `yupAdapter` implements `introspect()`; new `yupToJsonSchema(schema)` export built on `schema.describe()`.
- **json-schema**: `jsonSchemaAdapter` implements `introspect()` (returns the schema verbatim).
- **devtools**: new action registry — `registerDevtoolsAction({ id, label, title?, run(form) })`, `listDevtoolsActions()`, `subscribeDevtoolsActions()` — rendered as a toolbar in `<FillamentDevTools />`. Used by `@fillament/test-data` for its one-click fill button.

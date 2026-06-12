// Form shape discovery used by optional modules (@fillament/webmcp,
// @fillament/test-data). Prefers the validation adapter's `introspect()` and
// falls back to inferring a permissive JSON Schema from default/current values.
import type { FormApi } from "./form.js";
import type { ValidationAdapter } from "./types.js";

function isAdapterWithIntrospect(value: unknown): value is ValidationAdapter<any> & {
  introspect: () => Record<string, unknown>;
} {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { validate?: unknown }).validate === "function" &&
    typeof (value as { introspect?: unknown }).introspect === "function"
  );
}

/**
 * Infer a permissive JSON Schema from a plain values object. Used when the form
 * has no validation adapter (or one that cannot introspect). Types come from the
 * runtime values; nothing is marked `required`.
 */
export function inferJsonSchemaFromValues(values: unknown): Record<string, unknown> {
  if (values === null || values === undefined) return {};
  if (Array.isArray(values)) {
    return {
      type: "array",
      items: values.length > 0 ? inferJsonSchemaFromValues(values[0]) : {},
    };
  }
  switch (typeof values) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: Number.isInteger(values) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
        properties[key] = inferJsonSchemaFromValues(value);
      }
      return { type: "object", properties };
    }
    default:
      return {};
  }
}

/**
 * Resolve the JSON Schema describing a form's values.
 *
 * Order of preference:
 *   1. `adapter.introspect()` when the form's schema is a ValidationAdapter
 *      implementing it (zod/yup/json-schema adapters all do).
 *   2. Inference from default values, merged with current values for fields
 *      that have no default.
 *
 * Returns `{ type: "object", properties: {} }` when nothing is known, so
 * callers can always treat the result as an object schema.
 */
export function introspectForm<TValues>(form: FormApi<TValues>): Record<string, unknown> {
  const schema = form.options.schema;
  if (isAdapterWithIntrospect(schema)) {
    try {
      const result = schema.introspect();
      if (result && typeof result === "object") return result;
    } catch {
      // Fall through to value inference — introspection must never throw.
    }
  }
  const inferred = inferJsonSchemaFromValues({
    ...(form.getValues() as Record<string, unknown> | undefined),
    ...(form.getDefaultValues() as Record<string, unknown> | undefined),
  });
  if (inferred.type === "object") return inferred;
  return { type: "object", properties: {} };
}

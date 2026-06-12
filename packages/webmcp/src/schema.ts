// Schema helpers for the fill tool's inputSchema.

/**
 * Relax a JSON Schema for partial updates: agents send only the fields they
 * want to change, so `required` is dropped recursively and objects must accept
 * extra keys (dot-path keys like "address.city" are allowed and flattened by
 * the fill tool).
 */
export function relaxForPartialUpdate(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = { ...schema };
  delete out.required;
  if (out.type === "object") {
    delete out.additionalProperties;
    if (out.properties && typeof out.properties === "object") {
      const next: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(out.properties as Record<string, unknown>)) {
        next[key] =
          value && typeof value === "object"
            ? relaxForPartialUpdate(value as Record<string, unknown>)
            : value;
      }
      out.properties = next;
    }
  }
  if (out.type === "array" && out.items && typeof out.items === "object") {
    out.items = relaxForPartialUpdate(out.items as Record<string, unknown>);
  }
  return out;
}

/**
 * Flatten a patch object to leaf dot-paths so it can be applied with
 * `form.setValue` per path. Keys that already contain dots are kept as-is,
 * which lets agents address nested fields directly.
 */
export function flattenPatch(patch: Record<string, unknown>, parent = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const path = parent ? `${parent}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenPatch(value as Record<string, unknown>, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

/** MCP tool names must match [a-zA-Z0-9_-]. */
export function sanitizeToolName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "form";
}

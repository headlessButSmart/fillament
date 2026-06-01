import type { AIFieldDescription, AISchemaInput } from "./types.js";

// Minimum surface we depend on from a Zod schema (only enough to walk a top-level object).
type ZodTypeLike = {
  _def?: {
    typeName?: string;
    shape?: unknown;
    schema?: ZodTypeLike;
    innerType?: ZodTypeLike;
    value?: unknown;
    values?: unknown[];
    checks?: Array<{ kind: string; value?: unknown }>;
  };
  // Zod 3 ObjectType exposes a shape() function on _def
};

// Heuristic Zod detection — we don't want to depend on zod at runtime.
function isZodSchema(value: unknown): value is ZodTypeLike {
  if (!value || typeof value !== "object") return false;
  const def = (value as { _def?: unknown })._def;
  return !!def && typeof def === "object";
}

function unwrapZod(node: ZodTypeLike): ZodTypeLike {
  const def = node._def;
  if (!def) return node;
  // Optional / Nullable / Default wrappers expose `.innerType`
  if (def.innerType) return unwrapZod(def.innerType);
  // Effects / Branded wrappers expose `.schema`
  if (def.schema) return unwrapZod(def.schema);
  return node;
}

function zodToFieldDescription(node: ZodTypeLike): AIFieldDescription {
  const inner = unwrapZod(node);
  const typeName = inner._def?.typeName ?? "";
  switch (typeName) {
    case "ZodString": {
      const checks = inner._def?.checks ?? [];
      const fmt = checks.find((c) => c.kind === "email")
        ? "email"
        : checks.find((c) => c.kind === "url")
          ? "uri"
          : checks.find((c) => c.kind === "uuid")
            ? "uuid"
            : undefined;
      return { type: "string", ...(fmt ? { format: fmt } : {}) };
    }
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array" };
    case "ZodObject":
      return { type: "object" };
    case "ZodEnum": {
      const values = (inner._def?.values ?? []) as Array<string | number>;
      return { type: "string", enum: values };
    }
    case "ZodNativeEnum": {
      const values = Object.values(inner._def?.values ?? {}) as Array<string | number>;
      return { type: "string", enum: values };
    }
    case "ZodLiteral":
      return { type: typeof inner._def?.value === "number" ? "number" : "string" };
    default:
      return {};
  }
}

function zodShape(node: ZodTypeLike): Record<string, ZodTypeLike> | undefined {
  const def = node._def;
  if (!def || def.typeName !== "ZodObject") return undefined;
  // Zod 3 lazily resolves the shape via a function on .shape
  const shapeRef = (node as { shape?: unknown }).shape;
  if (typeof shapeRef === "function") {
    return (shapeRef as () => Record<string, ZodTypeLike>)();
  }
  if (shapeRef && typeof shapeRef === "object") {
    return shapeRef as Record<string, ZodTypeLike>;
  }
  return undefined;
}

function zodToJsonSchema(node: ZodTypeLike): Record<string, unknown> {
  const inner = unwrapZod(node);
  const desc = zodToFieldDescription(inner);
  if (desc.type === "object") {
    const shape = zodShape(inner);
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    if (shape) {
      for (const [key, child] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(child);
        const def = child._def;
        const isOptional = def?.typeName === "ZodOptional" || def?.typeName === "ZodDefault" || def?.typeName === "ZodNullable";
        if (!isOptional) required.push(key);
      }
    }
    const out: Record<string, unknown> = { type: "object", properties };
    if (required.length) out.required = required;
    return out;
  }
  if (desc.type === "array") {
    const itemDef = inner._def as { type?: ZodTypeLike };
    const item = itemDef.type ? zodToJsonSchema(itemDef.type) : {};
    return { type: "array", items: item };
  }
  const json: Record<string, unknown> = {};
  if (desc.type) json.type = desc.type;
  if (desc.format) json.format = desc.format;
  if (desc.enum) json.enum = desc.enum;
  return json;
}

// Build a JSON Schema-ish description object the LLM can read.
// Always falls back to a permissive {} when nothing is known.
export function resolveSchema(input?: AISchemaInput | Record<string, unknown>): Record<string, unknown> {
  if (!input) return { type: "object", properties: {} };

  // Tagged variants
  if (typeof input === "object" && "type" in input) {
    const tagged = input as AISchemaInput | Record<string, unknown>;
    if ("schema" in tagged && (tagged as AISchemaInput).type === "json-schema") {
      return (tagged as Extract<AISchemaInput, { type: "json-schema" }>).schema;
    }
    if ((tagged as AISchemaInput).type === "fields" && "fields" in tagged) {
      const fields = (tagged as Extract<AISchemaInput, { type: "fields" }>).fields;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [name, desc] of Object.entries(fields)) {
        properties[name] = {
          ...(desc.type ? { type: desc.type } : {}),
          ...(desc.format ? { format: desc.format } : {}),
          ...(desc.enum ? { enum: desc.enum } : {}),
          ...(desc.description ? { description: desc.description } : {}),
        };
        if (desc.required) required.push(name);
      }
      return { type: "object", properties, ...(required.length ? { required } : {}) };
    }
    if ((tagged as AISchemaInput).type === "zod" && "schema" in tagged) {
      const z = (tagged as Extract<AISchemaInput, { type: "zod" }>).schema;
      if (isZodSchema(z)) return zodToJsonSchema(z);
    }
  }

  // Plain object — could be either a raw Zod schema or a raw JSON Schema.
  if (isZodSchema(input as ZodTypeLike)) {
    return zodToJsonSchema(input as ZodTypeLike);
  }
  return input as Record<string, unknown>;
}

/**
 * Produce a partial-friendly variant of a JSON Schema for use as a grammar
 * constraint on an LLM patch response.
 *
 * The model is asked to return ONLY the fields it wants to change — never the
 * whole form. So the schema we hand to grammar-constrained sampling must:
 *
 *   - Drop every `required` array (a partial update may set zero of them)
 *   - Recurse into nested objects and arrays
 *   - Leave types / formats / enums alone (we still want correctness)
 *   - Not assert `additionalProperties: false` — the model may emit dot-path
 *     keys like `"address.city"` that the static shape wouldn't list. Our
 *     `flattenChanges()` rebuilds the tree afterwards.
 *
 * Safe on arbitrary input; returns a fresh, mutation-free object.
 */
export function relaxSchemaForPartialUpdate(
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = { ...schema };
  delete out.required;
  // Permit extra keys; the partial patch from the model may include dot-paths.
  if (out.type === "object") {
    delete (out as { additionalProperties?: unknown }).additionalProperties;
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(out.properties as Record<string, unknown>)) {
      next[k] = v && typeof v === "object"
        ? relaxSchemaForPartialUpdate(v as Record<string, unknown>)
        : v;
    }
    out.properties = next;
  }
  if (out.type === "array" && out.items && typeof out.items === "object") {
    out.items = relaxSchemaForPartialUpdate(out.items as Record<string, unknown>);
  }
  return out;
}

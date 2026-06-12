// Zod → JSON Schema introspection for the zodAdapter. Walks the schema
// structurally via `_def` so we never depend on zod at runtime; unknown node
// kinds degrade to `{}` (permissive) rather than throwing.

type ZodTypeLike = {
  _def?: {
    typeName?: string;
    shape?: unknown;
    schema?: ZodTypeLike;
    innerType?: ZodTypeLike;
    type?: ZodTypeLike;
    value?: unknown;
    values?: unknown;
    options?: ZodTypeLike[];
    checks?: Array<{ kind: string; value?: unknown; regex?: RegExp }>;
    description?: string;
    defaultValue?: () => unknown;
  };
  description?: string;
  shape?: unknown;
};

const OPTIONAL_WRAPPERS = new Set(["ZodOptional", "ZodNullable", "ZodDefault"]);

function unwrap(node: ZodTypeLike): ZodTypeLike {
  const def = node._def;
  if (!def) return node;
  if (def.innerType) return unwrap(def.innerType);
  if (def.schema) return unwrap(def.schema);
  return node;
}

function isOptional(node: ZodTypeLike): boolean {
  const typeName = node._def?.typeName;
  if (!typeName) return false;
  if (OPTIONAL_WRAPPERS.has(typeName)) return true;
  // Effects keep the optionality of the wrapped schema.
  if (node._def?.schema) return isOptional(node._def.schema);
  return false;
}

function shapeOf(node: ZodTypeLike): Record<string, ZodTypeLike> | undefined {
  if (node._def?.typeName !== "ZodObject") return undefined;
  const shapeRef = node.shape;
  if (typeof shapeRef === "function") return (shapeRef as () => Record<string, ZodTypeLike>)();
  if (shapeRef && typeof shapeRef === "object") return shapeRef as Record<string, ZodTypeLike>;
  return undefined;
}

const STRING_FORMATS: Record<string, string> = {
  email: "email",
  url: "uri",
  uuid: "uuid",
  datetime: "date-time",
  date: "date",
  time: "time",
  ip: "ipv4",
};

function stringSchema(node: ZodTypeLike): Record<string, unknown> {
  const out: Record<string, unknown> = { type: "string" };
  for (const check of node._def?.checks ?? []) {
    if (check.kind in STRING_FORMATS) out.format = STRING_FORMATS[check.kind];
    else if (check.kind === "min" && typeof check.value === "number") out.minLength = check.value;
    else if (check.kind === "max" && typeof check.value === "number") out.maxLength = check.value;
    else if (check.kind === "length" && typeof check.value === "number") {
      out.minLength = check.value;
      out.maxLength = check.value;
    } else if (check.kind === "regex" && check.regex) out.pattern = check.regex.source;
  }
  return out;
}

function numberSchema(node: ZodTypeLike): Record<string, unknown> {
  const out: Record<string, unknown> = { type: "number" };
  for (const check of node._def?.checks ?? []) {
    if (check.kind === "int") out.type = "integer";
    else if (check.kind === "min" && typeof check.value === "number") out.minimum = check.value;
    else if (check.kind === "max" && typeof check.value === "number") out.maximum = check.value;
    else if (check.kind === "multipleOf" && typeof check.value === "number") out.multipleOf = check.value;
  }
  return out;
}

/** Convert a Zod schema (any version exposing `_def`) to a JSON Schema object. */
export function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  return walk(schema as ZodTypeLike);
}

function walk(node: ZodTypeLike): Record<string, unknown> {
  const inner = unwrap(node);
  const description =
    node.description ?? node._def?.description ?? inner.description ?? inner._def?.description;
  const withDescription = (schema: Record<string, unknown>): Record<string, unknown> =>
    description ? { ...schema, description } : schema;

  switch (inner._def?.typeName) {
    case "ZodString":
      return withDescription(stringSchema(inner));
    case "ZodNumber":
      return withDescription(numberSchema(inner));
    case "ZodBigInt":
      return withDescription({ type: "integer" });
    case "ZodBoolean":
      return withDescription({ type: "boolean" });
    case "ZodDate":
      return withDescription({ type: "string", format: "date-time" });
    case "ZodLiteral": {
      const value = inner._def.value;
      return withDescription({
        type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string",
        const: value,
      });
    }
    case "ZodEnum":
      return withDescription({ type: "string", enum: [...((inner._def.values as unknown[]) ?? [])] });
    case "ZodNativeEnum": {
      const values = Object.values((inner._def.values as Record<string, unknown>) ?? {}).filter(
        (v) => typeof v === "string" || typeof v === "number"
      );
      return withDescription({ enum: values });
    }
    case "ZodArray": {
      const out: Record<string, unknown> = {
        type: "array",
        items: inner._def.type ? walk(inner._def.type) : {},
      };
      // Zod stores array bounds as exactMinLength/exactMaxLength-style defs in
      // some versions and as checks in others; handle the common `checks` form.
      for (const check of inner._def.checks ?? []) {
        if (check.kind === "min" && typeof check.value === "number") out.minItems = check.value;
        else if (check.kind === "max" && typeof check.value === "number") out.maxItems = check.value;
      }
      const defAny = inner._def as { minLength?: { value?: number } | null; maxLength?: { value?: number } | null };
      if (typeof defAny.minLength?.value === "number") out.minItems = defAny.minLength.value;
      if (typeof defAny.maxLength?.value === "number") out.maxItems = defAny.maxLength.value;
      return withDescription(out);
    }
    case "ZodObject": {
      const shape = shapeOf(inner) ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, child] of Object.entries(shape)) {
        properties[key] = walk(child);
        if (!isOptional(child)) required.push(key);
      }
      const out: Record<string, unknown> = { type: "object", properties };
      if (required.length) out.required = required;
      return withDescription(out);
    }
    case "ZodUnion": {
      const options = inner._def.options ?? [];
      // Unions of literals are effectively enums — flatten for friendlier output.
      const literals = options.map((o) => unwrap(o)._def).filter((d) => d?.typeName === "ZodLiteral");
      if (literals.length === options.length && options.length > 0) {
        return withDescription({ enum: literals.map((d) => d!.value) });
      }
      return withDescription({ anyOf: options.map((o) => walk(o)) });
    }
    case "ZodRecord":
      return withDescription({ type: "object" });
    case "ZodTuple":
      return withDescription({ type: "array" });
    default:
      return withDescription({});
  }
}

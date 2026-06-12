// Yup → JSON Schema introspection for the yupAdapter, built on yup's own
// `schema.describe()` so we stay off yup's internal types. Unknown node kinds
// degrade to `{}` (permissive) rather than throwing.

type YupTestDescription = { name?: string; params?: Record<string, unknown> };

type YupFieldDescription = {
  type?: string;
  label?: string;
  meta?: Record<string, unknown>;
  oneOf?: unknown[];
  tests?: YupTestDescription[];
  optional?: boolean;
  nullable?: boolean;
  fields?: Record<string, YupFieldDescription>;
  innerType?: YupFieldDescription;
};

type DescribableYupSchema = {
  describe: () => YupFieldDescription;
};

function numberParam(tests: YupTestDescription[] | undefined, name: string, key: string): number | undefined {
  const test = tests?.find((t) => t.name === name);
  const value = test?.params?.[key];
  return typeof value === "number" ? value : undefined;
}

function hasTest(tests: YupTestDescription[] | undefined, name: string): boolean {
  return !!tests?.some((t) => t.name === name);
}

function descriptionToJsonSchema(desc: YupFieldDescription): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (desc.label) out.description = desc.label;

  const oneOf = (desc.oneOf ?? []).filter((v) => v !== undefined && v !== null);
  if (oneOf.length > 0) out.enum = oneOf;

  switch (desc.type) {
    case "string": {
      out.type = "string";
      if (hasTest(desc.tests, "email")) out.format = "email";
      else if (hasTest(desc.tests, "url")) out.format = "uri";
      else if (hasTest(desc.tests, "uuid")) out.format = "uuid";
      const min = numberParam(desc.tests, "min", "min");
      const max = numberParam(desc.tests, "max", "max");
      const length = numberParam(desc.tests, "length", "length");
      if (min !== undefined) out.minLength = min;
      if (max !== undefined) out.maxLength = max;
      if (length !== undefined) {
        out.minLength = length;
        out.maxLength = length;
      }
      const matches = desc.tests?.find((t) => t.name === "matches")?.params?.regex;
      if (matches instanceof RegExp) out.pattern = matches.source;
      break;
    }
    case "number": {
      out.type = hasTest(desc.tests, "integer") ? "integer" : "number";
      const min = numberParam(desc.tests, "min", "min");
      const max = numberParam(desc.tests, "max", "max");
      if (min !== undefined) out.minimum = min;
      if (max !== undefined) out.maximum = max;
      break;
    }
    case "boolean":
      out.type = "boolean";
      break;
    case "date":
      out.type = "string";
      out.format = "date-time";
      break;
    case "array": {
      out.type = "array";
      out.items = desc.innerType ? descriptionToJsonSchema(desc.innerType) : {};
      const min = numberParam(desc.tests, "min", "min");
      const max = numberParam(desc.tests, "max", "max");
      if (min !== undefined) out.minItems = min;
      if (max !== undefined) out.maxItems = max;
      break;
    }
    case "object": {
      out.type = "object";
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, child] of Object.entries(desc.fields ?? {})) {
        properties[key] = descriptionToJsonSchema(child);
        const childRequired = hasTest(child.tests, "required") || child.optional === false;
        if (childRequired) required.push(key);
      }
      out.properties = properties;
      if (required.length) out.required = required;
      break;
    }
    default:
      // mixed / lazy / unknown — leave permissive.
      break;
  }
  return out;
}

/** Convert a Yup schema to a JSON Schema object via `schema.describe()`. */
export function yupToJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  const describable = schema as Partial<DescribableYupSchema>;
  if (typeof describable.describe !== "function") return {};
  try {
    return descriptionToJsonSchema(describable.describe());
  } catch {
    return {};
  }
}

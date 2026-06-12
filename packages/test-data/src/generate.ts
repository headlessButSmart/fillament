import { createRng, type Rng } from "./random.js";
import {
  fakeEpochMs,
  fakeIsoDate,
  fakeIsoDateTime,
  fakeEmail,
  fakePhone,
  fakeUrl,
  fakeUuid,
  fakeWords,
  generateFromName,
} from "./heuristics.js";

export type JsonSchemaLike = Record<string, unknown>;

export type GenerateOptions = {
  // Same seed → same output. Omit for a random seed per call.
  seed?: number;
  // Pin specific dot-paths to fixed values (or a generator receiving the rng).
  overrides?: Record<string, unknown | ((rng: Rng) => unknown)>;
  // Generate optional properties too. Defaults to true (fuller forms make
  // better manual test sessions); required properties are always generated.
  includeOptional?: boolean;
  // Item count for arrays without minItems/maxItems. Defaults to [1, 3].
  arrayBounds?: [min: number, max: number];
};

type Ctx = {
  rng: Rng;
  overrides: Record<string, unknown | ((rng: Rng) => unknown)>;
  includeOptional: boolean;
  arrayBounds: [number, number];
};

const FORMAT_GENERATORS: Record<string, (rng: Rng) => unknown> = {
  email: fakeEmail,
  uri: fakeUrl,
  url: fakeUrl,
  uuid: fakeUuid,
  "date-time": fakeIsoDateTime,
  date: fakeIsoDate,
  time: (rng) => `${String(rng.int(0, 23)).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00`,
  ipv4: (rng) => `${rng.int(1, 254)}.${rng.int(0, 254)}.${rng.int(0, 254)}.${rng.int(1, 254)}`,
};

function joinPath(parent: string, key: string | number): string {
  return parent ? `${parent}.${key}` : String(key);
}

function lastSegment(path: string): string {
  const segments = path.split(".").filter((s) => !/^\d+$/.test(s));
  return segments[segments.length - 1] ?? "";
}

function schemaType(schema: JsonSchemaLike): string | undefined {
  const type = schema.type;
  if (typeof type === "string") return type;
  if (Array.isArray(type)) return type.find((t) => t !== "null") as string | undefined;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  return undefined;
}

function generateString(schema: JsonSchemaLike, path: string, ctx: Ctx): string {
  const format = typeof schema.format === "string" ? schema.format : undefined;
  const formatGenerator = format ? FORMAT_GENERATORS[format] : undefined;
  if (formatGenerator) return String(formatGenerator(ctx.rng));

  const fromName = generateFromName(lastSegment(path), ctx.rng);
  let value =
    typeof fromName === "string" ? fromName : fakeWords(ctx.rng, ctx.rng.int(1, 3));

  const minLength = typeof schema.minLength === "number" ? schema.minLength : 0;
  const maxLength = typeof schema.maxLength === "number" ? schema.maxLength : undefined;
  while (value.length < minLength) value = `${value} ${fakeWords(ctx.rng, 1)}`;
  if (maxLength !== undefined && value.length > maxLength) value = value.slice(0, maxLength).trimEnd() || value.slice(0, maxLength);
  return value;
}

function generateNumber(schema: JsonSchemaLike, path: string, ctx: Ctx, integer: boolean): number {
  const minimum = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === "number" ? schema.maximum : undefined;

  if (minimum === undefined && maximum === undefined) {
    const fromName = generateFromName(lastSegment(path), ctx.rng);
    if (typeof fromName === "number") return integer ? Math.round(fromName) : fromName;
  }

  const lo = minimum ?? (maximum !== undefined ? Math.min(0, maximum) : 0);
  const hi = maximum ?? lo + 100;
  if (integer) return ctx.rng.int(Math.ceil(lo), Math.floor(hi));
  const value = lo + ctx.rng.next() * (hi - lo);
  return Math.round(value * 100) / 100;
}

function generateNode(schema: JsonSchemaLike, path: string, ctx: Ctx): unknown {
  const override = ctx.overrides[path];
  if (override !== undefined) {
    return typeof override === "function" ? (override as (rng: Rng) => unknown)(ctx.rng) : override;
  }

  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return ctx.rng.pick(schema.enum as unknown[]);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return ctx.rng.pick(schema.examples as unknown[]);
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return generateNode(ctx.rng.pick(schema.anyOf as JsonSchemaLike[]), path, ctx);
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return generateNode(ctx.rng.pick(schema.oneOf as JsonSchemaLike[]), path, ctx);
  }

  switch (schemaType(schema)) {
    case "string":
      return generateString(schema, path, ctx);
    case "integer":
      return generateNumber(schema, path, ctx, true);
    case "number":
      return generateNumber(schema, path, ctx, false);
    case "boolean":
      return ctx.rng.bool();
    case "null":
      return null;
    case "array": {
      const items = (schema.items as JsonSchemaLike) ?? {};
      const min = typeof schema.minItems === "number" ? schema.minItems : ctx.arrayBounds[0];
      const max = typeof schema.maxItems === "number" ? schema.maxItems : Math.max(min, ctx.arrayBounds[1]);
      const count = ctx.rng.int(min, max);
      return Array.from({ length: count }, (_, i) => generateNode(items, joinPath(path, i), ctx));
    }
    case "object": {
      const properties = (schema.properties as Record<string, JsonSchemaLike>) ?? {};
      const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(properties)) {
        if (!ctx.includeOptional && !required.has(key)) continue;
        out[key] = generateNode(child ?? {}, joinPath(path, key), ctx);
      }
      return out;
    }
    default: {
      // No type info — fall back to name heuristics, then a short string.
      const fromName = generateFromName(lastSegment(path), ctx.rng);
      if (fromName !== undefined) return fromName;
      return fakeWords(ctx.rng, 2);
    }
  }
}

/**
 * Generate a values object satisfying (a best effort of) the given JSON Schema.
 *
 * Resolution order per node: override → const/enum/examples → format generator →
 * property-name heuristic → type default. Deterministic for a given seed.
 */
export function generateTestValues<TValues = Record<string, unknown>>(
  schema: JsonSchemaLike,
  options: GenerateOptions = {}
): TValues {
  const ctx: Ctx = {
    rng: createRng(options.seed),
    overrides: options.overrides ?? {},
    includeOptional: options.includeOptional ?? true,
    arrayBounds: options.arrayBounds ?? [1, 3],
  };
  const root = schema && typeof schema === "object" ? schema : {};
  const result = generateNode(root as JsonSchemaLike, "", ctx);
  return (result && typeof result === "object" ? result : {}) as TValues;
}

export { fakeEpochMs };

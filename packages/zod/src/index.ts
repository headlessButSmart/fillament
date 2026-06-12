import type { z } from "zod";
import type {
  FieldValidationResult,
  FormError,
  ValidationAdapter,
  ValidationResult,
} from "@fillament/core";
import { zodToJsonSchema } from "./introspect.js";

type AnyZodSchema = {
  // Method (not arrow-property) syntax: method parameters are checked
  // bivariantly, so real Zod schemas — whose `pick` takes a stricter
  // generic mask (`Mask extends Exactly<...>`) — remain assignable.
  safeParseAsync(data: unknown): Promise<{
    success: boolean;
    data?: unknown;
    error?: { errors: Array<{ path: (string | number)[]; message: string; code?: string }> };
  }>;
  pick?(mask: any): AnyZodSchema;
  shape?: Record<string, unknown>;
};

function isZodSchema(value: unknown): value is AnyZodSchema {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).safeParseAsync === "function"
  );
}

function pathToString(path: (string | number)[]): string {
  return path.map(String).join(".");
}

function issuesToErrors(issues: { path: (string | number)[]; message: string; code?: string }[]): Record<string, FormError[]> {
  const out: Record<string, FormError[]> = {};
  for (const issue of issues) {
    const p = pathToString(issue.path);
    const entry: FormError = {
      message: issue.message,
      type: "schema",
      code: issue.code,
      path: p,
      source: "schema",
    };
    if (!out[p]) out[p] = [];
    out[p].push(entry);
  }
  return out;
}

export function zodAdapter<TSchema extends AnyZodSchema>(
  schema: TSchema
): ValidationAdapter<any> {
  return {
    type: "zod",
    introspect() {
      return zodToJsonSchema(schema as Record<string, unknown>);
    },
    async validate(values): Promise<ValidationResult<any>> {
      const result = await schema.safeParseAsync(values);
      if (result.success) {
        return { valid: true, errors: {} };
      }
      const issues = result.error?.errors ?? [];
      return {
        valid: false,
        errors: issuesToErrors(issues),
      };
    },
    async validateField(name: string, value: unknown, values: unknown): Promise<FieldValidationResult> {
      // For top-level fields, prefer schema.pick if available. Otherwise run full
      // validate and slice out errors for this path.
      const top = name.split(".")[0]!;
      if (schema.pick && schema.shape && top in schema.shape) {
        const sub = schema.pick({ [top]: true });
        const result = await sub.safeParseAsync({ [top]: (values as any)[top] });
        if (result.success) return { valid: true, errors: [] };
        const issues = (result.error?.errors ?? []).filter((i) => pathToString(i.path) === name || pathToString(i.path).startsWith(name + "."));
        return {
          valid: issues.length === 0,
          errors: issues.map((i) => ({
            message: i.message,
            type: "schema" as const,
            code: i.code,
            path: name,
            source: "schema" as const,
          })),
        };
      }
      const full = await schema.safeParseAsync(values);
      if (full.success) return { valid: true, errors: [] };
      const issues = (full.error?.errors ?? []).filter((i) => {
        const p = pathToString(i.path);
        return p === name || p.startsWith(name + ".");
      });
      return {
        valid: issues.length === 0,
        errors: issues.map((i) => ({
          message: i.message,
          type: "schema" as const,
          code: i.code,
          path: name,
          source: "schema" as const,
        })),
      };
    },
  };
}

export function isZodSchemaInput(value: unknown): boolean {
  return isZodSchema(value);
}

// Convenience: detect a raw zod schema and wrap it automatically.
export function resolveSchema(value: unknown): ValidationAdapter<any> | undefined {
  if (!value) return undefined;
  if (isZodSchema(value)) return zodAdapter(value);
  // Already an adapter
  if (typeof (value as any).validate === "function" && typeof (value as any).type === "string") {
    return value as ValidationAdapter<any>;
  }
  return undefined;
}

export { zodToJsonSchema } from "./introspect.js";

export type { z };

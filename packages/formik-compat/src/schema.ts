import type { FormError, ValidationAdapter, ValidationResult } from "@fillament/core";

// Detect Yup schema: has .validate(value, options) and a .__isYupSchema__ or .describe etc.
function isYupSchema(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return typeof v.validate === "function" && (v.__isYupSchema__ === true || typeof v.describe === "function");
}

// Detect Zod schema: has .safeParseAsync.
function isZodSchema(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return typeof (value as any).safeParseAsync === "function";
}

// Detect an existing Fillament adapter.
function isFillamentAdapter(value: unknown): value is ValidationAdapter<any> {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return typeof v.validate === "function" && typeof v.type === "string";
}

function normalizeYupPath(path: string | undefined): string {
  if (!path) return "";
  return path.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
}

function isLikelyYupError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; inner?: unknown[]; errors?: unknown[] };
  return e.name === "ValidationError" || Array.isArray(e.inner) || Array.isArray(e.errors);
}

function yupToAdapter(schema: any): ValidationAdapter<any> {
  return {
    type: "yup",
    async validate(values: unknown) {
      try {
        await schema.validate(values, { abortEarly: false });
        return { valid: true, errors: {} };
      } catch (err: any) {
        if (!isLikelyYupError(err)) throw err;
        const fields: Record<string, FormError[]> = {};
        const formErrors: FormError[] = [];
        const visit = (e: any) => {
          if (e.inner && e.inner.length) {
            for (const inner of e.inner) visit(inner);
            return;
          }
          const p = normalizeYupPath(e.path);
          const fe: FormError = { message: e.message, type: "schema", code: e.type, path: p || undefined, source: "schema" };
          if (p) {
            if (!fields[p]) fields[p] = [];
            fields[p]!.push(fe);
          } else {
            formErrors.push(fe);
          }
        };
        visit(err);
        return { valid: false, errors: fields, formErrors };
      }
    },
  };
}

function zodToAdapter(schema: any): ValidationAdapter<any> {
  return {
    type: "zod",
    async validate(values: unknown) {
      const result = await schema.safeParseAsync(values);
      if (result.success) return { valid: true, errors: {} };
      const issues = (result.error?.errors ?? []) as Array<{ path: (string | number)[]; message: string; code?: string }>;
      const fields: Record<string, FormError[]> = {};
      for (const issue of issues) {
        const p = issue.path.map(String).join(".");
        const fe: FormError = { message: issue.message, type: "schema", code: issue.code, path: p, source: "schema" };
        if (!fields[p]) fields[p] = [];
        fields[p]!.push(fe);
      }
      return { valid: false, errors: fields };
    },
  };
}

/**
 * Map a Formik-style `validationSchema` to a Fillament adapter. Accepts Yup,
 * Zod, or a pre-built Fillament adapter.
 */
// IMPORTANT: detection order matters. Yup schemas also expose `.validate` and
// `.type` (string like "object" / "string"), so they look like Fillament
// adapters at a glance — check Yup and Zod *before* the generic adapter shape.
export function resolveValidationSchema(schema: unknown): ValidationAdapter<any> | undefined {
  if (!schema) return undefined;
  if (isYupSchema(schema)) return yupToAdapter(schema);
  if (isZodSchema(schema)) return zodToAdapter(schema);
  if (isFillamentAdapter(schema)) return schema;
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "[@fillament/formik-compat] validationSchema is not a recognized Yup, Zod, or Fillament adapter. Validation will be skipped."
    );
  }
  return undefined;
}

/**
 * Map a Formik-style inline `validate` callback to the shape Fillament expects.
 * Formik returns a flat `{ "user.name": "Required" }` map; Fillament accepts
 * the same shape (its core normalizer handles it).
 */
export type FormikValidate<TValues> = (
  values: TValues
) => void | Promise<void> | FormikErrors<TValues> | Promise<FormikErrors<TValues>>;

// Formik-style errors: per-path string OR nested objects matching the shape of values.
export type FormikErrors<TValues = any> =
  | Partial<Record<string, string | string[]>>
  | { [K in keyof TValues]?: TValues[K] extends object ? FormikErrors<TValues[K]> : string | string[] };

export function flattenFormikErrors(input: FormikErrors<any> | void): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  const visit = (obj: any, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v == null) continue;
      if (typeof v === "string") out[path] = v;
      else if (Array.isArray(v)) {
        if (v.every((x) => typeof x === "string")) {
          if (v.length) out[path] = v[0]!;
        } else {
          v.forEach((item, i) => visit(item, `${path}.${i}`));
        }
      } else if (typeof v === "object") {
        visit(v, path);
      }
    }
  };
  visit(input, "");
  return out;
}

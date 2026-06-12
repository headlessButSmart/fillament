import type {
  FieldValidationResult,
  FormError,
  ValidationAdapter,
  ValidationResult,
} from "@fillament/core";
import { yupToJsonSchema } from "./introspect.js";

// Minimal shape we depend on — keeps us out of Yup's type maze.
type YupValidationError = Error & {
  name: "ValidationError";
  path?: string;
  type?: string;
  errors: string[];
  inner: YupValidationError[];
  message: string;
};

type YupSchema = {
  // Method (not arrow-property) syntax: method parameters are checked
  // bivariantly, so real yup schemas — whose options take the narrower
  // `ValidateOptions<AnyObject>` — remain assignable.
  validate(
    value: unknown,
    options?: { abortEarly?: boolean; context?: unknown; strict?: boolean }
  ): Promise<unknown>;
  validateAt?(
    path: string,
    value: unknown,
    options?: { abortEarly?: boolean; context?: unknown }
  ): Promise<unknown>;
};

function isYupValidationError(err: unknown): err is YupValidationError {
  return !!err && typeof err === "object" && (err as { name?: string }).name === "ValidationError";
}

function normalizePath(path: string | undefined): string {
  // Yup uses "address.city" but also "contacts[0].name" — normalize bracket syntax to dot.
  if (!path) return "";
  return path.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
}

function flattenErrors(err: YupValidationError): { fields: Record<string, FormError[]>; formErrors: FormError[] } {
  const fields: Record<string, FormError[]> = {};
  const formErrors: FormError[] = [];

  const visit = (e: YupValidationError) => {
    if (e.inner && e.inner.length) {
      for (const inner of e.inner) visit(inner);
      return;
    }
    const path = normalizePath(e.path);
    const fe: FormError = {
      message: e.message,
      type: "schema",
      code: e.type,
      path: path || undefined,
      source: "schema",
    };
    if (path) {
      if (!fields[path]) fields[path] = [];
      fields[path]!.push(fe);
    } else {
      formErrors.push(fe);
    }
  };

  visit(err);
  return { fields, formErrors };
}

export function yupAdapter<TValues = unknown>(schema: YupSchema): ValidationAdapter<TValues> {
  return {
    type: "yup",
    introspect() {
      return yupToJsonSchema(schema);
    },
    async validate(values): Promise<ValidationResult<TValues>> {
      try {
        await schema.validate(values, { abortEarly: false });
        return { valid: true, errors: {} };
      } catch (err) {
        if (!isYupValidationError(err)) throw err;
        const { fields, formErrors } = flattenErrors(err);
        return { valid: false, errors: fields, formErrors };
      }
    },
    async validateField(name: string, _value: unknown, values: unknown): Promise<FieldValidationResult> {
      if (schema.validateAt) {
        try {
          await schema.validateAt(name, values, { abortEarly: false });
          return { valid: true, errors: [] };
        } catch (err) {
          if (!isYupValidationError(err)) throw err;
          const { fields } = flattenErrors(err);
          const errs = fields[name] ?? [];
          for (const [k, v] of Object.entries(fields)) {
            if (k !== name && k.startsWith(`${name}.`)) errs.push(...v);
          }
          return { valid: errs.length === 0, errors: errs };
        }
      }
      // Fallback: run full validate and slice the result for this path.
      try {
        await schema.validate(values, { abortEarly: false });
        return { valid: true, errors: [] };
      } catch (err) {
        if (!isYupValidationError(err)) throw err;
        const { fields } = flattenErrors(err);
        const errs = fields[name] ?? [];
        return { valid: errs.length === 0, errors: errs };
      }
    },
  };
}

export { yupToJsonSchema } from "./introspect.js";

export type { YupSchema };

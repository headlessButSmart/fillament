import Ajv, { type Options as AjvOptions, type ValidateFunction, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type {
  FieldValidationResult,
  FormError,
  ValidationAdapter,
  ValidationResult,
} from "@fillament/core";

export type JsonSchema = Record<string, unknown>;

export type JsonSchemaAdapterOptions = {
  // Pre-configured Ajv instance — pass one to share schemas, custom keywords,
  // or formats across your app.
  ajv?: Ajv;
  // Options forwarded to Ajv when constructing a fresh instance.
  ajvOptions?: AjvOptions;
  // Skip auto-registering ajv-formats. Defaults to false.
  noFormats?: boolean;
};

/**
 * Convert an AJV error object to a Fillament FormError, computing the dot-path
 * that matches our field naming convention (`address.city`, `contacts.0.name`).
 */
function errorToFormError(error: ErrorObject): { path: string; error: FormError } {
  // AJV gives instancePath like "/contacts/0/name" or "" for the root.
  let path = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
  // For "required" errors AJV reports the parent path; the missing property
  // sits in params.missingProperty. Append it so the error lands on the field.
  if (error.keyword === "required" && error.params?.missingProperty) {
    path = path ? `${path}.${error.params.missingProperty}` : String(error.params.missingProperty);
  }
  return {
    path,
    error: {
      message: error.message ?? "Invalid value",
      type: "schema",
      code: String(error.keyword),
      path,
      source: "schema",
      meta: { params: error.params, schemaPath: error.schemaPath },
    },
  };
}

function aggregate(errors: ErrorObject[]): {
  fields: Record<string, FormError[]>;
  formErrors: FormError[];
} {
  const fields: Record<string, FormError[]> = {};
  const formErrors: FormError[] = [];
  for (const e of errors) {
    const { path, error } = errorToFormError(e);
    if (!path) {
      formErrors.push(error);
    } else {
      if (!fields[path]) fields[path] = [];
      fields[path]!.push(error);
    }
  }
  return { fields, formErrors };
}

/**
 * Build a Fillament validation adapter from a JSON Schema object.
 *
 * @example
 * const schema = {
 *   type: "object",
 *   required: ["email"],
 *   properties: {
 *     email: { type: "string", format: "email" },
 *     age: { type: "integer", minimum: 18 },
 *   },
 * };
 *
 * const form = useForm({ schema: jsonSchemaAdapter(schema) });
 */
export function jsonSchemaAdapter<TValues = unknown>(
  schema: JsonSchema,
  options: JsonSchemaAdapterOptions = {}
): ValidationAdapter<TValues> {
  const ajv =
    options.ajv ??
    new Ajv({
      allErrors: true,
      strict: false,
      ...options.ajvOptions,
    });
  if (!options.ajv && !options.noFormats) {
    // Cast: addFormats accepts the same Ajv instance type.
    (addFormats as unknown as (ajv: Ajv) => void)(ajv);
  }

  const validateFn: ValidateFunction = ajv.compile(schema);

  return {
    type: "json-schema",
    async validate(values: TValues): Promise<ValidationResult<TValues>> {
      const valid = validateFn(values);
      if (valid) return { valid: true, errors: {} };
      const { fields, formErrors } = aggregate(validateFn.errors ?? []);
      return {
        valid: false,
        errors: fields,
        formErrors,
      };
    },
    async validateField(name: string, _value: unknown, values: unknown): Promise<FieldValidationResult> {
      const valid = validateFn(values);
      if (valid) return { valid: true, errors: [] };
      const { fields } = aggregate(validateFn.errors ?? []);
      const errs = fields[name] ?? [];
      // Also include errors from any child path so e.g. validating "address"
      // surfaces "address.city is required".
      for (const [k, v] of Object.entries(fields)) {
        if (k !== name && k.startsWith(`${name}.`)) errs.push(...v);
      }
      return { valid: errs.length === 0, errors: errs };
    },
  };
}

export type { Ajv };

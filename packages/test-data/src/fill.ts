import { introspectForm, type FormApi } from "@fillament/core";
import { generateTestValues, type GenerateOptions } from "./generate.js";

export type FillOptions = GenerateOptions & {
  // Keep values the user already entered; only fill fields that are empty
  // (undefined, null, or ""). Defaults to false — a full refill.
  onlyEmpty?: boolean;
  // Run form validation after filling. Defaults to true so generated data is
  // immediately checked against the real schema.
  validate?: boolean;
};

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function mergeOnlyEmpty(current: unknown, generated: unknown): unknown {
  if (isEmpty(current)) return generated;
  if (
    current &&
    generated &&
    typeof current === "object" &&
    typeof generated === "object" &&
    !Array.isArray(current) &&
    !Array.isArray(generated)
  ) {
    const out: Record<string, unknown> = { ...(current as Record<string, unknown>) };
    for (const [key, value] of Object.entries(generated as Record<string, unknown>)) {
      out[key] = mergeOnlyEmpty(out[key], value);
    }
    return out;
  }
  return current;
}

/**
 * Fill a form with generated test data derived from its validation schema
 * (via `introspectForm`) and set the result with `setValues`.
 *
 * Returns the values that were applied. Pass a `seed` for reproducible fills.
 */
export function fillFormWithTestData<TValues>(
  form: FormApi<TValues>,
  options: FillOptions = {}
): Partial<TValues> {
  const schema = introspectForm(form);
  const generated = generateTestValues<Partial<TValues>>(schema, options);
  const values = options.onlyEmpty
    ? (mergeOnlyEmpty(form.getValues(), generated) as Partial<TValues>)
    : generated;
  form.setValues(values, { shouldValidate: options.validate ?? true });
  return values;
}

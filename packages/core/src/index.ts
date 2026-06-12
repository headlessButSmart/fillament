export {
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  hasPath,
  isEqual,
  parsePath,
  joinPath,
  isPathUnder,
} from "./path.js";

export { PathEmitter, SimpleEmitter } from "./emitter.js";

export { compileVisibilityExpression, resolveVisibility } from "./visibility.js";
export type { VisibilityPredicate } from "./visibility.js";

export { createForm, createFormStore } from "./form.js";
export type { FormApi, FieldRegistration } from "./form.js";

export { createFieldArray } from "./fieldArray.js";
export type { FieldArrayApi, FieldArrayItem } from "./fieldArray.js";

export type { FillamentPlugin, FillamentPluginContext } from "./plugin.js";

export { introspectForm, inferJsonSchemaFromValues } from "./introspect.js";

export * from "./types.js";

// Tiny helper for users who want to build their own adapter inline.
import type { ValidationAdapter, ValidationResult } from "./types.js";

export function createValidationAdapter<TValues>(
  validate: (values: TValues) => ValidationResult<TValues> | Promise<ValidationResult<TValues>>,
  options: { type?: string; validateField?: ValidationAdapter<TValues>["validateField"] } = {}
): ValidationAdapter<TValues> {
  return {
    type: options.type ?? "custom",
    validate: async (values) => Promise.resolve(validate(values)),
    ...(options.validateField ? { validateField: options.validateField } : {}),
  };
}

// Aliases matching the spec — small helpers that some teams will want.
import type { FormApi } from "./form.js";
import { getValueAtPath as _get } from "./path.js";

export function isDirty(form: FormApi<any>): boolean {
  return form.getState().dirty;
}

export function isTouched(form: FormApi<any>, path?: string): boolean {
  const state = form.getState();
  if (!path) return Object.keys(state.touched).length > 0;
  return !!state.touched[path];
}

export function validateForm<T>(form: FormApi<T>) {
  return form.validate();
}

export function validateField<T>(form: FormApi<T>, name: string) {
  return form.validateField(name);
}

export function createField<T = unknown>(form: FormApi<any>, name: string) {
  return {
    name,
    get value() {
      return _get<T>(form.getValues(), name);
    },
    setValue: (value: T) => form.setValue(name, value, { shouldTouch: true, shouldValidate: true }),
    setTouched: (touched: boolean = true) => form.setFieldTouched(name, touched),
    register: () => form.registerField(name),
  };
}

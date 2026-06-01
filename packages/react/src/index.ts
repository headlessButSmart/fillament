export { Form, FormProvider } from "./Form.js";
export type { FormProps, FormProviderProps } from "./Form.js";

export { Field } from "./Field.js";
export type { FieldProps } from "./Field.js";

export { FieldArray, useFieldArray } from "./FieldArray.js";
export type { FieldArrayProps } from "./FieldArray.js";

export { FieldArrayTable } from "./FieldArrayTable.js";
export type { FieldArrayTableProps, TableColumn } from "./FieldArrayTable.js";

export { FieldsRenderer } from "./FieldsRenderer.js";
export type { FieldsRendererProps, FieldConfig } from "./FieldsRenderer.js";

export {
  useForm,
  useFormState,
  useFormStateSelector,
  useFormValues,
  useWatch,
} from "./useForm.js";

export { useField, useFieldState } from "./useField.js";
export type { FieldRenderProps, UseFieldOptions } from "./useField.js";

export {
  FormContext,
  useFormContext,
  useFormContextOrNull,
  useComponents,
  createFormUI,
} from "./context.js";
export type { ComponentRegistry, FormProviderValue } from "./context.js";

export { createComponentAdapter } from "./componentAdapter.js";
export type { ComponentAdapterOptions } from "./componentAdapter.js";

// Re-export commonly used core types and helpers for convenience.
export type {
  FormApi,
  FormState,
  FormError,
  FormOptions,
  FieldState,
  SubmitHandler,
  ValidationAdapter,
  ValidationResult,
  AnalyticsEvent,
  DevtoolsEvent,
  VisibilityPredicate,
  FieldArrayApi,
  UnmountBehavior,
} from "@fillament/core";

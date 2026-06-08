// Extension point used by optional modules (persist, remote, redux, etc.).
// Plugins observe lifecycle events without changing core form behavior.
// If onInit returns a function, it is treated as a cleanup invoked on form teardown.
import type { FormApi } from "./form.js";
import type { FormError } from "./types.js";

export interface FillamentPluginContext<TValues = unknown> {
  form: FormApi<TValues>;
  formId: string;
}

export interface FillamentPlugin<TValues = unknown> {
  name?: string;

  onInit?: (ctx: FillamentPluginContext<TValues>) => void | (() => void);

  onValuesChange?: (
    values: TValues,
    ctx: FillamentPluginContext<TValues>
  ) => void;

  onSubmitSuccess?: (
    values: TValues,
    ctx: FillamentPluginContext<TValues>
  ) => void;

  onSubmitError?: (
    error: unknown,
    ctx: FillamentPluginContext<TValues>
  ) => void;

  onReset?: (ctx: FillamentPluginContext<TValues>) => void;

  onValidationError?: (
    errors: Record<string, FormError[]>,
    ctx: FillamentPluginContext<TValues>
  ) => void;
}

import {
  deleteValueAtPath,
  getValueAtPath,
  isEqual,
  setValueAtPath,
} from "./path.js";
import { PathEmitter, SimpleEmitter } from "./emitter.js";
import { resolveVisibility, type VisibilityPredicate } from "./visibility.js";
import type { FillamentPlugin, FillamentPluginContext } from "./plugin.js";
import type {
  AnalyticsEvent,
  DevtoolsEvent,
  FieldOptions,
  FieldState,
  FormError,
  FormOptions,
  FormState,
  InlineValidate,
  SubmitHandler,
  SubmitHelpers,
  Unsubscribe,
  ValidationAdapter,
  ValidationResult,
} from "./types.js";

let formIdCounter = 0;

function genFormId(): string {
  formIdCounter += 1;
  return `form_${formIdCounter}`;
}

function normalizeError(err: FormError | string): FormError {
  return typeof err === "string" ? { message: err, type: "custom" } : err;
}

function isValidationAdapter(value: unknown): value is ValidationAdapter<any> {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).validate === "function" &&
    typeof (value as any).type === "string"
  );
}

// Normalize whatever an inline `validate` returns into a ValidationResult.
async function runInlineValidate<TValues>(
  fn: InlineValidate<TValues>,
  values: TValues
): Promise<ValidationResult<TValues>> {
  const raw = await fn(values);
  if (raw == null) return { valid: true, errors: {} };
  if (typeof raw === "object" && "valid" in raw && "errors" in raw) {
    return raw as ValidationResult<TValues>;
  }
  const errors: Record<string, FormError[]> = {};
  for (const [path, value] of Object.entries(raw as Record<string, unknown>)) {
    const list: FormError[] = Array.isArray(value)
      ? (value as FormError[]).map((e) =>
          typeof e === "string" ? { message: e, type: "custom" as const } : e
        )
      : typeof value === "string"
        ? [{ message: value, type: "custom" as const }]
        : [value as FormError];
    if (list.length) errors[path] = list;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// Compose adapter + inline validate so the rest of the engine just sees a single
// adapter that knows how to run both.
function composeValidation<TValues>(
  adapter: ValidationAdapter<TValues> | undefined,
  inline: InlineValidate<TValues> | undefined
): ValidationAdapter<TValues> | undefined {
  if (!adapter && !inline) return undefined;
  return {
    type: adapter ? `${adapter.type}+inline` : "inline",
    async validate(values) {
      const schemaResult = adapter ? await adapter.validate(values) : ({ valid: true, errors: {} } as ValidationResult<TValues>);
      if (!inline) return schemaResult;
      const inlineResult = await runInlineValidate(inline, values);
      const merged: Record<string, FormError[]> = { ...schemaResult.errors as Record<string, FormError[]> };
      for (const [k, v] of Object.entries(inlineResult.errors)) {
        merged[k] = [...(merged[k] ?? []), ...(v ?? [])];
      }
      const formErrors = [...(schemaResult.formErrors ?? []), ...(inlineResult.formErrors ?? [])];
      return {
        valid: Object.keys(merged).every((k) => (merged[k] ?? []).length === 0) && formErrors.length === 0,
        errors: merged,
        formErrors,
      };
    },
    async validateField(name, value, values) {
      if (adapter?.validateField) {
        const schemaResult = await adapter.validateField(name, value, values);
        if (!inline) return schemaResult;
        const inlineResult = await runInlineValidate(inline, values);
        const inlineErrs = (inlineResult.errors[name] ?? []) as FormError[];
        return {
          valid: schemaResult.errors.length === 0 && inlineErrs.length === 0,
          errors: [...schemaResult.errors, ...inlineErrs],
        };
      }
      // Fall back to whole-form validate and slice the result.
      const full = await (adapter ? adapter.validate(values) : { valid: true, errors: {} } as ValidationResult<TValues>);
      const inlineFull = inline ? await runInlineValidate(inline, values) : ({ valid: true, errors: {} } as ValidationResult<TValues>);
      const errs = [
        ...((full.errors[name] ?? []) as FormError[]),
        ...((inlineFull.errors[name] ?? []) as FormError[]),
      ];
      return { valid: errs.length === 0, errors: errs };
    },
  };
}

export type FieldRegistration = {
  name: string;
  options: FieldOptions;
  visiblePredicate?: VisibilityPredicate<any>;
  refCount: number;
};

export type FormApi<TValues = any> = {
  readonly id: string;
  readonly options: FormOptions<TValues>;

  getState(): FormState<TValues>;
  getValues(): TValues;
  getValue<T = unknown>(path: string): T | undefined;
  getDefaultValues(): Partial<TValues>;

  setValue(path: string, value: unknown, opts?: { shouldValidate?: boolean; shouldTouch?: boolean }): void;
  setValues(values: Partial<TValues>, opts?: { shouldValidate?: boolean }): void;
  setFieldValue(path: string, value: unknown, opts?: { shouldValidate?: boolean; shouldTouch?: boolean }): void;

  setFieldError(path: string, error: FormError | string): void;
  setErrors(errors: Record<string, FormError[] | FormError | string>): void;
  clearErrors(): void;
  clearFieldErrors(path: string): void;
  setFormErrors(errors: FormError[]): void;

  setTouched(path: string, touched?: boolean): void;
  setFieldTouched(path: string, touched?: boolean): void;

  registerField(name: string, options?: FieldOptions, visiblePredicate?: VisibilityPredicate<TValues>): Unsubscribe;
  unregisterField(name: string): void;
  isFieldVisible(name: string): boolean;
  getFieldState(name: string): FieldState;
  incrementRenderCount(name: string): void;

  validate(): Promise<ValidationResult<TValues>>;
  validateField(name: string): Promise<FormError[]>;

  submit(): Promise<void>;
  reset(values?: Partial<TValues>): void;

  subscribe(path: string, listener: () => void): Unsubscribe;
  subscribeFormState(listener: (state: FormState<TValues>) => void): Unsubscribe;
  subscribeAnalytics(listener: (event: AnalyticsEvent) => void): Unsubscribe;
  subscribeDevtools(listener: (event: DevtoolsEvent) => void): Unsubscribe;

  emitAnalytics(event: Omit<AnalyticsEvent, "timestamp" | "formId"> & { timestamp?: number; formId?: string }): void;

  get canSubmit(): boolean;
  get formState(): FormState<TValues>;
};

export function createForm<TValues = any>(options: FormOptions<TValues> = {}): FormApi<TValues> {
  const id = options.id ?? genFormId();
  const defaultValues = (options.defaultValues ?? {}) as Partial<TValues>;
  const rawAdapter: ValidationAdapter<TValues> | undefined = isValidationAdapter(options.schema)
    ? (options.schema as ValidationAdapter<TValues>)
    : undefined;
  const adapter = composeValidation(rawAdapter, options.validate);

  let state: FormState<TValues> = {
    values: structuredClone(defaultValues) as TValues,
    defaultValues: structuredClone(defaultValues),
    errors: {},
    formErrors: [],
    touched: {},
    dirty: false,
    dirtyFields: {},
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    submitCount: 0,
  };

  const fields = new Map<string, FieldRegistration>();
  const fieldStates = new Map<string, FieldState>();

  const valueEmitter = new PathEmitter();
  const stateEmitter = new SimpleEmitter<FormState<TValues>>();
  const analyticsEmitter = new SimpleEmitter<AnalyticsEvent>();
  const devtoolsEmitter = new SimpleEmitter<DevtoolsEvent>();

  function emitDevtools(event: DevtoolsEvent): void {
    devtoolsEmitter.emit(event);
  }

  function emitAnalyticsRaw(event: AnalyticsEvent): void {
    analyticsEmitter.emit(event);
  }

  function emitAnalyticsEvent(
    partial: Omit<AnalyticsEvent, "timestamp" | "formId"> & { timestamp?: number; formId?: string }
  ): void {
    const event: AnalyticsEvent = {
      timestamp: partial.timestamp ?? Date.now(),
      formId: partial.formId ?? id,
      type: partial.type,
      field: partial.field,
      fieldHash: partial.fieldHash,
      stepId: partial.stepId,
      errorCode: partial.errorCode,
      durationMs: partial.durationMs,
      meta: partial.meta,
    };
    emitAnalyticsRaw(event);
  }

  function ensureFieldState(name: string): FieldState {
    let fs = fieldStates.get(name);
    if (!fs) {
      fs = {
        name,
        touched: false,
        dirty: false,
        errors: [],
        visible: true,
        registered: false,
        validating: false,
        renderCount: 0,
      };
      fieldStates.set(name, fs);
    }
    return fs;
  }

  function recomputeDirty(): void {
    const dirtyFields: Record<string, boolean> = {};
    let anyDirty = false;
    for (const name of fieldStates.keys()) {
      const cur = getValueAtPath(state.values, name);
      const def = getValueAtPath(state.defaultValues, name);
      const isDirty = !isEqual(cur, def);
      if (isDirty) {
        dirtyFields[name] = true;
        anyDirty = true;
      }
      const fs = ensureFieldState(name);
      fs.dirty = isDirty;
    }
    state.dirtyFields = dirtyFields;
    state.dirty = anyDirty;
  }

  function recomputeValid(): void {
    const hasFieldErrors = Object.keys(state.errors).some(
      (k) => (state.errors[k] ?? []).length > 0
    );
    state.isValid = !hasFieldErrors && state.formErrors.length === 0;
  }

  function notifyState(): void {
    stateEmitter.emit(state);
  }

  function applyVisibilityForAll(): { changed: string[] } {
    const changed: string[] = [];
    for (const [name, reg] of fields) {
      const fs = ensureFieldState(name);
      const visible = resolveVisibility(reg.visiblePredicate, state.values);
      if (fs.visible !== visible) {
        fs.visible = visible;
        changed.push(name);
        if (!visible) {
          const behavior = reg.options.unmountBehavior;
          if (behavior === "clear" || behavior === "clear-and-unvalidate") {
            state.values = deleteValueAtPath(state.values as object, name) as TValues;
            if (behavior === "clear-and-unvalidate") {
              delete state.errors[name];
            }
          }
        }
      }
    }
    return { changed };
  }

  // Set value internally without emitting analytics for "field_changed" (which is
  // a user-driven event). Callers like setValue/setFieldValue trigger that.
  function applyValue(path: string, value: unknown): boolean {
    const current = getValueAtPath(state.values, path);
    if (isEqual(current, value)) return false;
    state.values = setValueAtPath(state.values as object, path, value) as TValues;
    return true;
  }

  function api_setValue(
    path: string,
    value: unknown,
    opts: { shouldValidate?: boolean; shouldTouch?: boolean } = {}
  ): void {
    const changed = applyValue(path, value);
    if (!changed) return;
    // Ensure a field state exists so dirty/touched tracking works even when the
    // caller hasn't registered the field through registerField (e.g. arrays).
    ensureFieldState(path);
    if (opts.shouldTouch) {
      state.touched = { ...state.touched, [path]: true };
      const fs = ensureFieldState(path);
      fs.touched = true;
    }
    recomputeDirty();
    const vis = applyVisibilityForAll();
    valueEmitter.emit(path);
    for (const c of vis.changed) valueEmitter.emit(c);
    emitDevtools({ type: "field:change", formId: id, field: path, timestamp: Date.now() });
    emitAnalyticsEvent({ type: "field_changed", field: path });
    notifyState();
    notifyPluginsValuesChange();

    if (opts.shouldValidate || shouldValidateOn("change")) {
      void api_validateField(path);
    }
  }

  function api_setValues(values: Partial<TValues>, opts: { shouldValidate?: boolean } = {}): void {
    state.values = { ...state.values, ...(values as any) };
    recomputeDirty();
    applyVisibilityForAll();
    valueEmitter.emit("");
    notifyState();
    notifyPluginsValuesChange();
    if (opts.shouldValidate) void api_validate();
  }

  function shouldValidateOn(when: "change" | "blur" | "submit" | "mount"): boolean {
    const list = options.validateOn ?? ["blur", "submit"];
    return list.includes(when);
  }

  function shouldRevalidateOn(when: "change" | "blur" | "submit"): boolean {
    const list = options.revalidateOn ?? ["change", "blur", "submit"];
    return list.includes(when);
  }

  function api_setFieldError(path: string, error: FormError | string): void {
    const normalized = normalizeError(error);
    const list = state.errors[path] ?? [];
    state.errors = { ...state.errors, [path]: [...list, normalized] };
    const fs = ensureFieldState(path);
    fs.errors = state.errors[path]!;
    recomputeValid();
    valueEmitter.emit(path);
    emitAnalyticsEvent({ type: "field_error", field: path, errorCode: normalized.code });
    notifyState();
  }

  function api_setErrors(errors: Record<string, FormError[] | FormError | string>): void {
    const next: Record<string, FormError[]> = {};
    for (const [k, v] of Object.entries(errors)) {
      const list = Array.isArray(v) ? v.map(normalizeError) : [normalizeError(v)];
      next[k] = list;
      const fs = ensureFieldState(k);
      fs.errors = list;
    }
    state.errors = next;
    recomputeValid();
    valueEmitter.emit("");
    notifyState();
  }

  function api_clearErrors(): void {
    state.errors = {};
    state.formErrors = [];
    for (const fs of fieldStates.values()) fs.errors = [];
    recomputeValid();
    valueEmitter.emit("");
    notifyState();
  }

  function api_clearFieldErrors(path: string): void {
    if (state.errors[path]) {
      const had = state.errors[path]!.length > 0;
      const next = { ...state.errors };
      delete next[path];
      state.errors = next;
      const fs = ensureFieldState(path);
      fs.errors = [];
      recomputeValid();
      valueEmitter.emit(path);
      if (had) emitAnalyticsEvent({ type: "field_error_resolved", field: path });
      notifyState();
    }
  }

  function api_setFormErrors(errors: FormError[]): void {
    state.formErrors = errors;
    recomputeValid();
    notifyState();
  }

  function api_setTouched(path: string, touched: boolean = true): void {
    state.touched = { ...state.touched, [path]: touched };
    const fs = ensureFieldState(path);
    fs.touched = touched;
    valueEmitter.emit(path);
    emitDevtools({ type: "field:blur", formId: id, field: path, timestamp: Date.now() });
    emitAnalyticsEvent({ type: "field_blurred", field: path });
    notifyState();

    if (touched && (shouldValidateOn("blur") || (state.errors[path]?.length && shouldRevalidateOn("blur")))) {
      void api_validateField(path);
    }
  }

  function api_registerField(
    name: string,
    fieldOptions: FieldOptions = {},
    visiblePredicate?: VisibilityPredicate<any>
  ): Unsubscribe {
    let reg = fields.get(name);
    if (!reg) {
      reg = { name, options: fieldOptions, visiblePredicate, refCount: 0 };
      fields.set(name, reg);
      emitDevtools({ type: "field:register", formId: id, field: name, timestamp: Date.now() });

      // apply default value if path is empty
      const cur = getValueAtPath(state.values, name);
      if (cur === undefined && fieldOptions.defaultValue !== undefined) {
        state.values = setValueAtPath(state.values as object, name, fieldOptions.defaultValue) as TValues;
        state.defaultValues = setValueAtPath(state.defaultValues as object, name, fieldOptions.defaultValue) as Partial<TValues>;
      }
    } else {
      reg.options = { ...reg.options, ...fieldOptions };
      if (visiblePredicate) reg.visiblePredicate = visiblePredicate;
    }
    reg.refCount += 1;

    const fs = ensureFieldState(name);
    fs.registered = true;
    fs.visible = resolveVisibility(reg.visiblePredicate, state.values);

    if (shouldValidateOn("mount")) {
      void api_validateField(name);
    }

    return () => api_unregisterField(name);
  }

  function api_unregisterField(name: string): void {
    const reg = fields.get(name);
    if (!reg) return;
    reg.refCount -= 1;
    if (reg.refCount > 0) return;

    const behavior = reg.options.unmountBehavior ?? (options.preserveUnmountedFields ? "preserve" : "preserve");
    fields.delete(name);
    const fs = fieldStates.get(name);
    if (fs) fs.registered = false;

    emitDevtools({ type: "field:unregister", formId: id, field: name, timestamp: Date.now() });

    if (behavior === "clear" || behavior === "clear-and-unvalidate") {
      state.values = deleteValueAtPath(state.values as object, name) as TValues;
      delete state.touched[name];
      if (behavior === "clear-and-unvalidate") {
        delete state.errors[name];
      }
      fieldStates.delete(name);
      recomputeDirty();
      recomputeValid();
      valueEmitter.emit(name);
      notifyState();
    }
  }

  function api_isFieldVisible(name: string): boolean {
    return ensureFieldState(name).visible;
  }

  function api_getFieldState(name: string): FieldState {
    const fs = ensureFieldState(name);
    fs.errors = state.errors[name] ?? [];
    fs.touched = state.touched[name] ?? false;
    fs.dirty = !!state.dirtyFields[name];
    return { ...fs };
  }

  function api_incrementRenderCount(name: string): void {
    const fs = ensureFieldState(name);
    fs.renderCount += 1;
  }

  async function api_validate(): Promise<ValidationResult<TValues>> {
    if (!adapter) {
      const result: ValidationResult<TValues> = { valid: true, errors: {} };
      api_clearErrors();
      return result;
    }
    state.isValidating = true;
    notifyState();
    emitDevtools({ type: "validation:start", formId: id, timestamp: Date.now() });
    const start = Date.now();
    try {
      const result = await adapter.validate(state.values);
      const next: Record<string, FormError[]> = {};
      for (const [k, v] of Object.entries(result.errors)) {
        if (v && v.length) next[k] = v;
      }
      state.errors = next;
      state.formErrors = result.formErrors ?? [];
      for (const [name, fs] of fieldStates) {
        fs.errors = next[name] ?? [];
      }
      recomputeValid();
      const dur = Date.now() - start;
      emitDevtools({ type: "validation:end", formId: id, durationMs: dur, timestamp: Date.now() });
      for (const fieldPath of Object.keys(next)) {
        emitAnalyticsEvent({ type: "field_error", field: fieldPath, errorCode: next[fieldPath]?.[0]?.code });
      }
      if (!result.valid) notifyPluginsValidationError();
      return result;
    } finally {
      state.isValidating = false;
      valueEmitter.emit("");
      notifyState();
    }
  }

  async function api_validateField(name: string): Promise<FormError[]> {
    if (!adapter) return [];
    const fs = ensureFieldState(name);
    fs.validating = true;
    emitDevtools({ type: "validation:start", formId: id, field: name, timestamp: Date.now() });
    const start = Date.now();
    try {
      if (adapter.validateField) {
        const value = getValueAtPath(state.values, name);
        const result = await adapter.validateField(name, value, state.values);
        const before = state.errors[name] ?? [];
        if (result.errors.length) {
          state.errors = { ...state.errors, [name]: result.errors };
          fs.errors = result.errors;
        } else {
          const next = { ...state.errors };
          delete next[name];
          state.errors = next;
          fs.errors = [];
          if (before.length) emitAnalyticsEvent({ type: "field_error_resolved", field: name });
        }
        recomputeValid();
        valueEmitter.emit(name);
        notifyState();
        return result.errors;
      }
      // Fallback: run full validate, but only emit errors for this field.
      const full = await adapter.validate(state.values);
      const before = state.errors[name] ?? [];
      const errs = (full.errors[name] ?? []) as FormError[];
      if (errs.length) {
        state.errors = { ...state.errors, [name]: errs };
        fs.errors = errs;
      } else {
        const next = { ...state.errors };
        delete next[name];
        state.errors = next;
        fs.errors = [];
        if (before.length) emitAnalyticsEvent({ type: "field_error_resolved", field: name });
      }
      recomputeValid();
      valueEmitter.emit(name);
      notifyState();
      return errs;
    } finally {
      fs.validating = false;
      const dur = Date.now() - start;
      emitDevtools({ type: "validation:end", formId: id, field: name, durationMs: dur, timestamp: Date.now() });
    }
  }

  async function api_submit(): Promise<void> {
    if (state.isSubmitting) return;
    state.isSubmitting = true;
    state.submitCount += 1;
    notifyState();
    emitDevtools({ type: "submit:start", formId: id, timestamp: Date.now() });
    const start = Date.now();
    let success = false;
    try {
      if (adapter) {
        const result = await api_validate();
        if (!result.valid) {
          emitAnalyticsEvent({ type: "form_submit_failed" });
          return;
        }
      }
      const helpers: SubmitHelpers<TValues> = {
        setFieldError: (path, err) => api_setFieldError(path, err),
        setErrors: (errs) => api_setErrors(errs),
        resetForm: (values) => api_reset(values),
        setSubmitting: (submitting) => {
          state.isSubmitting = submitting;
          notifyState();
        },
      };
      if (options.onSubmit) {
        await options.onSubmit(state.values, helpers);
      }
      state.submittedAt = Date.now();
      success = true;
      emitAnalyticsEvent({ type: "form_submitted", durationMs: Date.now() - start });
      notifyPluginsSubmitSuccess(state.values);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      state.formErrors = [...state.formErrors, { message: msg, type: "server" }];
      emitAnalyticsEvent({ type: "form_submit_failed", errorCode: "submit_threw" });
      notifyPluginsSubmitError(err);
    } finally {
      state.isSubmitting = false;
      emitDevtools({
        type: "submit:end",
        formId: id,
        success,
        durationMs: Date.now() - start,
        timestamp: Date.now(),
      });
      valueEmitter.emit("");
      notifyState();
    }
  }

  function api_reset(values?: Partial<TValues>): void {
    state.values = structuredClone(values ?? state.defaultValues) as TValues;
    state.defaultValues = values ? structuredClone(values) : state.defaultValues;
    state.errors = {};
    state.formErrors = [];
    state.touched = {};
    state.dirtyFields = {};
    state.dirty = false;
    state.isSubmitting = false;
    state.isValidating = false;
    state.isValid = true;
    state.submitCount = 0;
    for (const fs of fieldStates.values()) {
      fs.touched = false;
      fs.dirty = false;
      fs.errors = [];
    }
    applyVisibilityForAll();
    emitDevtools({ type: "form:reset", formId: id, timestamp: Date.now() });
    valueEmitter.emit("");
    notifyState();
    notifyPluginsReset();
  }

  // Plugin wiring (additive — has no effect if `plugins` is undefined or empty).
  // Plugins observe lifecycle events; they cannot prevent or rewrite them.
  // `formApi` is referenced inside these helpers but only invoked once the
  // literal below has been assigned, so the closure resolves correctly.
  const rawPlugins = (options.plugins ?? []) as ReadonlyArray<FillamentPlugin<TValues>>;
  const activePlugins: FillamentPlugin<TValues>[] = rawPlugins.filter(
    (p): p is FillamentPlugin<TValues> => !!p && typeof p === "object"
  );

  function pluginCtx(): FillamentPluginContext<TValues> {
    return { form: formApi, formId: id };
  }

  function safeRunPlugin(label: string, fn: () => void): void {
    try {
      fn();
    } catch (err) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn(`[fillament] plugin ${label} threw`, err);
      }
    }
  }

  function notifyPluginsValuesChange(): void {
    if (activePlugins.length === 0) return;
    const ctx = pluginCtx();
    for (const p of activePlugins) {
      if (p.onValuesChange) safeRunPlugin(p.name ?? "onValuesChange", () => p.onValuesChange!(state.values, ctx));
    }
  }

  function notifyPluginsSubmitSuccess(values: TValues): void {
    if (activePlugins.length === 0) return;
    const ctx = pluginCtx();
    for (const p of activePlugins) {
      if (p.onSubmitSuccess) safeRunPlugin(p.name ?? "onSubmitSuccess", () => p.onSubmitSuccess!(values, ctx));
    }
  }

  function notifyPluginsSubmitError(err: unknown): void {
    if (activePlugins.length === 0) return;
    const ctx = pluginCtx();
    for (const p of activePlugins) {
      if (p.onSubmitError) safeRunPlugin(p.name ?? "onSubmitError", () => p.onSubmitError!(err, ctx));
    }
  }

  function notifyPluginsReset(): void {
    if (activePlugins.length === 0) return;
    const ctx = pluginCtx();
    for (const p of activePlugins) {
      if (p.onReset) safeRunPlugin(p.name ?? "onReset", () => p.onReset!(ctx));
    }
  }

  function notifyPluginsValidationError(): void {
    if (activePlugins.length === 0) return;
    const ctx = pluginCtx();
    const errs = state.errors;
    for (const p of activePlugins) {
      if (p.onValidationError) safeRunPlugin(p.name ?? "onValidationError", () => p.onValidationError!(errs, ctx));
    }
  }

  emitDevtools({ type: "form:init", formId: id, timestamp: Date.now() });
  emitAnalyticsEvent({ type: "form_started" });

  const formApi: FormApi<TValues> = {
    id,
    options,
    getState: () => state,
    getValues: () => state.values,
    getValue: (path) => getValueAtPath(state.values, path),
    getDefaultValues: () => state.defaultValues,
    setValue: api_setValue,
    setValues: api_setValues,
    setFieldValue: api_setValue,
    setFieldError: api_setFieldError,
    setErrors: api_setErrors,
    clearErrors: api_clearErrors,
    clearFieldErrors: api_clearFieldErrors,
    setFormErrors: api_setFormErrors,
    setTouched: api_setTouched,
    setFieldTouched: api_setTouched,
    registerField: api_registerField,
    unregisterField: api_unregisterField,
    isFieldVisible: api_isFieldVisible,
    getFieldState: api_getFieldState,
    incrementRenderCount: api_incrementRenderCount,
    validate: api_validate,
    validateField: api_validateField,
    submit: api_submit,
    reset: api_reset,
    subscribe: (path, listener) => valueEmitter.on(path, () => listener()),
    subscribeFormState: (listener) => stateEmitter.on(listener),
    subscribeAnalytics: (listener) => analyticsEmitter.on(listener),
    subscribeDevtools: (listener) => devtoolsEmitter.on(listener),
    emitAnalytics: emitAnalyticsEvent,
    get canSubmit() {
      return !state.isSubmitting && state.isValid;
    },
    get formState() {
      return state;
    },
  };

  // Fire plugin onInit hooks now that the public API is constructed. Returned
  // cleanup functions are stored; consumers can dispose them via __disposePlugins.
  const pluginCleanups: Array<() => void> = [];
  if (activePlugins.length > 0) {
    const ctx = pluginCtx();
    for (const p of activePlugins) {
      if (!p.onInit) continue;
      try {
        const cleanup = p.onInit(ctx);
        if (typeof cleanup === "function") pluginCleanups.push(cleanup);
      } catch (err) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn(`[fillament] plugin ${p.name ?? "onInit"} threw`, err);
        }
      }
    }
  }

  // Internal escape hatch for environments that need to fire plugin teardown
  // (e.g. component unmount in @fillament/react). Hidden from the public type to
  // keep the API surface unchanged.
  (formApi as unknown as { __disposePlugins: () => void }).__disposePlugins = () => {
    while (pluginCleanups.length) {
      const fn = pluginCleanups.pop();
      if (!fn) continue;
      try { fn(); } catch { /* swallow — teardown must never throw */ }
    }
  };

  return formApi;
}

// Convenience alias matching the spec
export const createFormStore = createForm;

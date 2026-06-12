// Core type definitions for Fillament

export type FormError = {
  message: string;
  type?: "required" | "schema" | "server" | "custom" | "unknown";
  code?: string;
  path?: string;
  source?: "client" | "server" | "schema";
  meta?: Record<string, unknown>;
};

export type ValidationResult<TValues = any> = {
  valid: boolean;
  errors: Partial<Record<string, FormError[]>>;
  formErrors?: FormError[];
};

export type FieldValidationResult = {
  valid: boolean;
  errors: FormError[];
};

export type ValidationAdapter<TValues = any> = {
  type: string;
  validate: (values: TValues) => Promise<ValidationResult<TValues>>;
  validateField?: (
    name: string,
    value: unknown,
    values: TValues
  ) => Promise<FieldValidationResult>;
  // Optional, additive. Returns a JSON Schema description of the values shape so
  // optional modules (@fillament/webmcp, @fillament/test-data, ...) can discover
  // fields, types, and constraints without depending on the validation library.
  introspect?: () => Record<string, unknown>;
};

export type ValidateOn = "change" | "blur" | "submit" | "mount";
export type RevalidateOn = "change" | "blur" | "submit";
export type FormMode = "controlled" | "uncontrolled" | "hybrid";
export type UnmountBehavior = "preserve" | "clear" | "clear-and-unvalidate";

export type FieldState = {
  name: string;
  touched: boolean;
  dirty: boolean;
  errors: FormError[];
  visible: boolean;
  registered: boolean;
  validating: boolean;
  renderCount: number;
};

export type FormState<TValues = any> = {
  values: TValues;
  defaultValues: Partial<TValues>;
  errors: Record<string, FormError[]>;
  formErrors: FormError[];
  touched: Record<string, boolean>;
  dirty: boolean;
  dirtyFields: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  submitCount: number;
  submittedAt?: number;
};

export type SubmitHandler<TValues> = (
  values: TValues,
  helpers: SubmitHelpers<TValues>
) => void | Promise<void>;

export type SubmitHelpers<TValues> = {
  setFieldError: (name: string, error: FormError | string) => void;
  setErrors: (errors: Record<string, FormError[] | FormError | string>) => void;
  resetForm: (values?: Partial<TValues>) => void;
  setSubmitting: (submitting: boolean) => void;
};

export type ServerValidationOptions<TValues> = {
  endpoint?: string;
  validate?: (payload: {
    values: TValues;
    field?: string;
    signal: AbortSignal;
  }) => Promise<ValidationResult<TValues>>;
  debounceMs?: number;
  validateOn?: Array<"change" | "blur" | "submit">;
  mapErrors?: (response: unknown) => ValidationResult<TValues>;
};

// Formik-compatible inline validate. May return a flat errors-by-path object
// (`{ "user.email": "Required" }`) or a full ValidationResult.
export type InlineValidate<TValues> = (
  values: TValues
) =>
  | void
  | Promise<void>
  | Record<string, FormError | FormError[] | string>
  | Promise<Record<string, FormError | FormError[] | string>>
  | ValidationResult<TValues>
  | Promise<ValidationResult<TValues>>;

export type FormOptions<TValues> = {
  id?: string;
  schema?: ValidationAdapter<TValues> | unknown;
  validate?: InlineValidate<TValues>;
  defaultValues?: Partial<TValues>;
  mode?: FormMode;
  validateOn?: ValidateOn[];
  revalidateOn?: RevalidateOn[];
  preserveUnmountedFields?: boolean;
  onSubmit?: SubmitHandler<TValues>;
  serverValidation?: ServerValidationOptions<TValues>;
  analytics?: unknown;
  devtools?: unknown;
  // Optional plugin extension point used by @fillament/persist, @fillament/redux,
  // and other optional modules. Plugins observe lifecycle events but never alter
  // existing core behavior — see plugin.ts for the interface.
  plugins?: ReadonlyArray<unknown>;
};

// i18n-compatible message type. Optional modules (notably @fillament/i18n) may
// resolve `{ key, values?, fallback? }` messages alongside plain strings. The
// core itself does not perform resolution — this is an additive type alias so
// the rest of the ecosystem can speak the same shape.
export type FillamentMessage =
  | string
  | {
      key: string;
      values?: Record<string, unknown>;
      fallback?: string;
    };

export type FieldOptions = {
  defaultValue?: unknown;
  validateOn?: ValidateOn[];
  unmountBehavior?: UnmountBehavior;
  visible?: boolean;
};

// ---- Path utility types (constrained to keep TS happy on heavy nesting) ----

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type PathImpl<T, Depth extends number = 6> = Depth extends never
  ? never
  : T extends ReadonlyArray<infer U>
    ? `${number}` | `${number}.${PathImpl<U, Prev[Depth]>}`
    : T extends object
      ? {
          [K in keyof T & (string | number)]:
            | `${K}`
            | (T[K] extends object
                ? `${K}.${PathImpl<T[K], Prev[Depth]>}`
                : never);
        }[keyof T & (string | number)]
      : never;

export type FieldPath<T> = T extends object ? PathImpl<T> & string : string;

export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : T extends ReadonlyArray<infer U>
      ? PathValue<U, Rest>
      : unknown
  : P extends keyof T
    ? T[P]
    : T extends ReadonlyArray<infer U>
      ? P extends `${number}`
        ? U
        : unknown
      : unknown;

export type FieldValue<T, P extends string> = PathValue<T, P>;

// ---- Events ----

export type AnalyticsEventType =
  | "form_started"
  | "form_submitted"
  | "form_submit_failed"
  | "form_abandoned"
  | "field_focused"
  | "field_blurred"
  | "field_changed"
  | "field_error"
  | "field_error_resolved"
  | "step_viewed"
  | "step_completed"
  | "server_validation_started"
  | "server_validation_failed"
  | "server_validation_succeeded";

export type AnalyticsEvent = {
  type: AnalyticsEventType;
  formId: string;
  field?: string;
  fieldHash?: string;
  stepId?: string;
  errorCode?: string;
  durationMs?: number;
  timestamp: number;
  meta?: Record<string, unknown>;
};

export type DevtoolsEvent =
  | { type: "form:init"; formId: string; timestamp: number }
  | { type: "form:reset"; formId: string; timestamp: number }
  | { type: "field:register"; formId: string; field: string; timestamp: number }
  | { type: "field:unregister"; formId: string; field: string; timestamp: number }
  | { type: "field:change"; formId: string; field: string; timestamp: number }
  | { type: "field:blur"; formId: string; field: string; timestamp: number }
  | { type: "field:focus"; formId: string; field: string; timestamp: number }
  | { type: "validation:start"; formId: string; field?: string; timestamp: number }
  | { type: "validation:end"; formId: string; field?: string; durationMs: number; timestamp: number }
  | { type: "submit:start"; formId: string; timestamp: number }
  | { type: "submit:end"; formId: string; success: boolean; durationMs: number; timestamp: number }
  | { type: "array:append"; formId: string; field: string; timestamp: number }
  | { type: "array:remove"; formId: string; field: string; index: number; timestamp: number }
  | { type: "array:move"; formId: string; field: string; from: number; to: number; timestamp: number };

export type FormEvent = AnalyticsEvent | DevtoolsEvent;

export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;

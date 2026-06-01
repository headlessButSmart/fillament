import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  createForm,
  getValueAtPath,
  type FormApi,
  type FormError,
  type FormOptions,
  type SubmitHelpers,
  type ValidationResult,
} from "@fillament/core";
import { useFormState } from "@fillament/react";
import {
  flattenFormikErrors,
  resolveValidationSchema,
  type FormikErrors,
  type FormikValidate,
} from "./schema.js";

export type FormikConfig<TValues> = {
  initialValues: TValues;
  validationSchema?: unknown;
  validate?: FormikValidate<TValues>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  validateOnMount?: boolean;
  enableReinitialize?: boolean;
  onSubmit: (values: TValues, helpers: FormikSubmitHelpers<TValues>) => void | Promise<void>;
  // Formik options we don't fully support yet — surfaced as warnings instead of failing.
  innerRef?: unknown;
};

export type FormikSubmitHelpers<TValues> = {
  setSubmitting: (isSubmitting: boolean) => void;
  setErrors: (errors: FormikErrors<TValues>) => void;
  setFieldError: (field: string, message: string | undefined) => void;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
  setStatus: (status: unknown) => void;
  resetForm: (next?: Partial<{ values: TValues; errors: FormikErrors<TValues>; touched: Record<string, boolean> }>) => void;
};

export type FormikBag<TValues> = {
  values: TValues;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  dirty: boolean;
  submitCount: number;
  status?: unknown;

  // Handlers
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (e: React.ChangeEvent<any>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  handleReset: () => void;

  // Setters
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
  setFieldError: (field: string, message: string | undefined) => void;
  setValues: (values: Partial<TValues>, shouldValidate?: boolean) => void;
  setErrors: (errors: FormikErrors<TValues>) => void;
  setTouched: (touched: Record<string, boolean>) => void;
  setStatus: (status: unknown) => void;
  setSubmitting: (isSubmitting: boolean) => void;

  // Imperatives
  submitForm: () => Promise<void>;
  validateForm: () => Promise<Record<string, string>>;
  validateField: (field: string) => Promise<string | undefined>;
  resetForm: (next?: Partial<{ values: TValues; errors: FormikErrors<TValues>; touched: Record<string, boolean> }>) => void;

  // Per-field convenience (parity with formik.getFieldProps)
  getFieldProps: (name: string) => {
    name: string;
    value: unknown;
    onChange: (e: React.ChangeEvent<any>) => void;
    onBlur: (e: React.FocusEvent<any>) => void;
  };
  getFieldMeta: (name: string) => {
    value: unknown;
    initialValue: unknown;
    touched: boolean;
    error: string | undefined;
  };

  // Escape hatch: the underlying Fillament form, for power users.
  __form: FormApi<TValues>;
};

function warnUnsupported(name: string) {
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      `[@fillament/formik-compat] The Formik prop "${name}" is not fully supported in v0.1. The form will still render but behavior may differ.`
    );
  }
}

function extractEventValue(e: React.ChangeEvent<any>): unknown {
  const target = e?.target;
  if (!target) return undefined;
  if (target.type === "checkbox") return target.checked;
  if (target.type === "number") {
    const raw = target.value;
    return raw === "" ? "" : Number(raw);
  }
  if (target.multiple && target.selectedOptions) {
    return Array.from(target.selectedOptions as HTMLOptionsCollection).map((o: any) => o.value);
  }
  return target.value;
}

function readErrors(form: FormApi<any>): Record<string, string> {
  const state = form.getState();
  const out: Record<string, string> = {};
  for (const [k, list] of Object.entries(state.errors)) {
    const first = (list as FormError[])?.[0];
    if (first?.message) out[k] = first.message;
  }
  return out;
}

export function useFormik<TValues extends object = any>(config: FormikConfig<TValues>): FormikBag<TValues> {
  if (config.innerRef) warnUnsupported("innerRef");

  const initialRef = useRef(config.initialValues);
  const statusRef = useRef<unknown>(undefined);

  const formRef = useRef<FormApi<TValues> | null>(null);
  if (!formRef.current) {
    const adapter = resolveValidationSchema(config.validationSchema);
    const validateOn: FormOptions<TValues>["validateOn"] = [];
    if (config.validateOnBlur !== false) validateOn.push("blur");
    validateOn.push("submit");
    if (config.validateOnMount) validateOn.push("mount");
    const revalidateOn: FormOptions<TValues>["revalidateOn"] = [];
    if (config.validateOnChange !== false) revalidateOn.push("change");
    if (config.validateOnBlur !== false) revalidateOn.push("blur");
    revalidateOn.push("submit");

    formRef.current = createForm<TValues>({
      defaultValues: config.initialValues as Partial<TValues>,
      schema: adapter,
      validate: config.validate
        ? async (values) => {
            const raw = await config.validate!(values);
            return flattenFormikErrors(raw);
          }
        : undefined,
      validateOn,
      revalidateOn,
      onSubmit: async (values, helpers: SubmitHelpers<TValues>) => {
        const submitHelpers: FormikSubmitHelpers<TValues> = {
          setSubmitting: helpers.setSubmitting,
          setErrors: (errs) => {
            const flat = flattenFormikErrors(errs);
            helpers.setErrors(flat);
          },
          setFieldError: (field, message) => {
            if (message) helpers.setFieldError(field, { message, type: "custom" });
          },
          setFieldValue: (field, value, shouldValidate) =>
            formRef.current!.setValue(field, value, { shouldValidate, shouldTouch: true }),
          setFieldTouched: (field, isTouched = true) =>
            formRef.current!.setFieldTouched(field, isTouched),
          setStatus: (status) => {
            statusRef.current = status;
          },
          resetForm: (next) => helpers.resetForm(next?.values as Partial<TValues> | undefined),
        };
        await config.onSubmit(values, submitHelpers);
      },
    });
  }

  // enableReinitialize: if initialValues changes by reference, reset the form.
  useEffect(() => {
    if (config.enableReinitialize && initialRef.current !== config.initialValues) {
      initialRef.current = config.initialValues;
      formRef.current!.reset(config.initialValues as Partial<TValues>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enableReinitialize, config.initialValues]);

  const form = formRef.current!;
  const state = useFormState(form);

  // ---- Stable handlers ----

  const handleChange = useCallback(
    (e: React.ChangeEvent<any>) => {
      const name = e?.target?.name;
      if (!name) return;
      form.setValue(name, extractEventValue(e));
    },
    [form]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<any>) => {
      const name = e?.target?.name;
      if (!name) return;
      form.setFieldTouched(name, true);
    },
    [form]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault?.();
      void form.submit();
    },
    [form]
  );

  const handleReset = useCallback(() => form.reset(initialRef.current as Partial<TValues>), [form]);

  const setFieldValue = useCallback(
    (field: string, value: unknown, shouldValidate?: boolean) =>
      form.setValue(field, value, { shouldValidate, shouldTouch: true }),
    [form]
  );

  const setFieldTouched = useCallback(
    (field: string, isTouched: boolean = true) => form.setFieldTouched(field, isTouched),
    [form]
  );

  const setFieldError = useCallback(
    (field: string, message: string | undefined) => {
      if (!message) form.clearFieldErrors(field);
      else form.setFieldError(field, { message, type: "custom" });
    },
    [form]
  );

  const setValues = useCallback(
    (values: Partial<TValues>, shouldValidate?: boolean) =>
      form.setValues(values, { shouldValidate }),
    [form]
  );

  const setErrors = useCallback(
    (errors: FormikErrors<TValues>) => {
      const flat = flattenFormikErrors(errors);
      const mapped: Record<string, FormError[]> = {};
      for (const [k, v] of Object.entries(flat)) mapped[k] = [{ message: v, type: "custom" }];
      form.setErrors(mapped);
    },
    [form]
  );

  const setTouched = useCallback(
    (touched: Record<string, boolean>) => {
      for (const [k, v] of Object.entries(touched)) form.setFieldTouched(k, v);
    },
    [form]
  );

  const setStatus = useCallback((status: unknown) => {
    statusRef.current = status;
  }, []);

  const setSubmitting = useCallback(
    (isSubmitting: boolean) => {
      form.getState().isSubmitting = isSubmitting;
    },
    [form]
  );

  const submitForm = useCallback(() => form.submit(), [form]);

  const validateForm = useCallback(async (): Promise<Record<string, string>> => {
    const result: ValidationResult<TValues> = await form.validate();
    const errors: Record<string, string> = {};
    for (const [k, list] of Object.entries(result.errors)) {
      const first = (list as FormError[])?.[0];
      if (first?.message) errors[k] = first.message;
    }
    return errors;
  }, [form]);

  const validateField = useCallback(
    async (field: string): Promise<string | undefined> => {
      const errs = await form.validateField(field);
      return errs[0]?.message;
    },
    [form]
  );

  const resetForm = useCallback(
    (next?: Partial<{ values: TValues; errors: FormikErrors<TValues>; touched: Record<string, boolean> }>) => {
      form.reset((next?.values ?? initialRef.current) as Partial<TValues>);
      if (next?.errors) setErrors(next.errors);
      if (next?.touched) setTouched(next.touched);
    },
    [form, setErrors, setTouched]
  );

  const getFieldProps = useCallback(
    (name: string) => ({
      name,
      value: getValueAtPath(form.getValues(), name),
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [form, handleChange, handleBlur]
  );

  const getFieldMeta = useCallback(
    (name: string) => ({
      value: getValueAtPath(form.getValues(), name),
      initialValue: getValueAtPath(initialRef.current as object, name),
      touched: !!form.getState().touched[name],
      error: form.getState().errors[name]?.[0]?.message,
    }),
    [form]
  );

  const errors = useMemo(() => readErrors(form), [form, state.errors]);

  return {
    values: state.values,
    errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    isValid: state.isValid,
    dirty: state.dirty,
    submitCount: state.submitCount,
    status: statusRef.current,

    handleSubmit,
    handleChange,
    handleBlur,
    handleReset,

    setFieldValue,
    setFieldTouched,
    setFieldError,
    setValues,
    setErrors,
    setTouched,
    setStatus,
    setSubmitting,

    submitForm,
    validateForm,
    validateField,
    resetForm,

    getFieldProps,
    getFieldMeta,

    __form: form,
  };
}

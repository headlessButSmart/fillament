import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FieldState, FormApi, FormError, ValidateOn, UnmountBehavior } from "@fillament/core";
import type { VisibilityPredicate } from "@fillament/core";
import { useFormContext } from "./context.js";

function fieldStateSig(form: FormApi<any>, name: string): string {
  const fs = form.getFieldState(name);
  const errCodes = fs.errors.map((e) => e.code ?? e.message).join("|");
  return `${fs.touched ? "1" : "0"}.${fs.dirty ? "1" : "0"}.${fs.visible ? "1" : "0"}.${fs.validating ? "1" : "0"}.${errCodes}`;
}

export type UseFieldOptions = {
  defaultValue?: unknown;
  validateOn?: ValidateOn[];
  visibleWhen?: VisibilityPredicate<any>;
  unmountBehavior?: UnmountBehavior;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
};

export type FieldRenderProps<TValue = unknown> = {
  name: string;
  value: TValue;
  defaultValue: TValue;
  error?: FormError;
  errors: FormError[];
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  visible: boolean;
  onChange: (valueOrEvent: unknown) => void;
  onBlur: () => void;
  onFocus: () => void;
  setValue: (value: TValue) => void;
  setTouched: (touched?: boolean) => void;
  validate: () => Promise<FormError[]>;
  inputProps: {
    name: string;
    value: TValue extends undefined ? "" : TValue;
    onChange: (e: any) => void;
    onBlur: () => void;
    onFocus: () => void;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    disabled?: boolean;
    required?: boolean;
  };
};

function extractValue(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "object" && "target" in (input as any)) {
    const target = (input as any).target as HTMLInputElement;
    if (target.type === "checkbox") return target.checked;
    if (target.type === "number") {
      const raw = target.value;
      return raw === "" ? "" : Number(raw);
    }
    return target.value;
  }
  return input;
}

export function useField<TValue = unknown>(
  name: string,
  options: UseFieldOptions = {},
  formOverride?: FormApi<any>
): FieldRenderProps<TValue> {
  const ctxForm = formOverride ?? useFormContext();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const unregister = ctxForm.registerField(
      name,
      {
        defaultValue: options.defaultValue,
        validateOn: options.validateOn,
        unmountBehavior: options.unmountBehavior,
      },
      options.visibleWhen
    );
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxForm, name]);

  // value subscription
  const value = useSyncExternalStore(
    (cb) => ctxForm.subscribe(name, cb),
    () => ctxForm.getValue<TValue>(name) as TValue,
    () => ctxForm.getValue<TValue>(name) as TValue
  );

  // field state subscription via a stable signature so React doesn't re-render
  // forever on snapshot identity changes.
  const sigRef = useRef<string>(fieldStateSig(ctxForm, name));
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => {
      const next = fieldStateSig(ctxForm, name);
      if (next !== sigRef.current) {
        sigRef.current = next;
        force((c) => c + 1);
      }
    };
    return ctxForm.subscribe(name, update);
  }, [ctxForm, name]);
  const fieldState: FieldState = ctxForm.getFieldState(name);

  ctxForm.incrementRenderCount(name);

  const onChange = useCallback(
    (valueOrEvent: unknown) => {
      const extracted = extractValue(valueOrEvent);
      ctxForm.setValue(name, extracted, { shouldTouch: false });
    },
    [ctxForm, name]
  );

  const onBlur = useCallback(() => {
    ctxForm.setFieldTouched(name, true);
  }, [ctxForm, name]);

  const onFocus = useCallback(() => {
    ctxForm.emitAnalytics({ type: "field_focused", field: name });
  }, [ctxForm, name]);

  const setValue = useCallback(
    (next: TValue) => ctxForm.setValue(name, next, { shouldTouch: true, shouldValidate: true }),
    [ctxForm, name]
  );

  const setTouched = useCallback(
    (touched: boolean = true) => ctxForm.setFieldTouched(name, touched),
    [ctxForm, name]
  );

  const validate = useCallback(() => ctxForm.validateField(name), [ctxForm, name]);

  const errors = fieldState.errors;
  const required = !!options.required;
  const disabled = !!options.disabled;
  const errorId = errors.length ? `${name}-error` : undefined;

  return useMemo<FieldRenderProps<TValue>>(
    () => ({
      name,
      value: value as TValue,
      defaultValue: undefined as TValue,
      error: errors[0],
      errors,
      touched: fieldState.touched,
      dirty: fieldState.dirty,
      valid: errors.length === 0,
      invalid: errors.length > 0,
      disabled,
      required,
      visible: fieldState.visible,
      onChange,
      onBlur,
      onFocus,
      setValue,
      setTouched,
      validate,
      inputProps: {
        name,
        value: (value ?? "") as any,
        onChange,
        onBlur,
        onFocus,
        ...(errors.length ? { "aria-invalid": true, "aria-describedby": errorId } : {}),
        ...(disabled ? { disabled: true } : {}),
        ...(required ? { required: true } : {}),
      },
    }),
    [name, value, errors, fieldState.touched, fieldState.dirty, fieldState.visible, disabled, required, onChange, onBlur, onFocus, setValue, setTouched, validate, errorId]
  );
}

export function useFieldState(name: string, formOverride?: FormApi<any>): FieldState {
  const ctxForm = formOverride ?? useFormContext();
  const sigRef = useRef<string>(fieldStateSig(ctxForm, name));
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => {
      const next = fieldStateSig(ctxForm, name);
      if (next !== sigRef.current) {
        sigRef.current = next;
        force((c) => c + 1);
      }
    };
    return ctxForm.subscribe(name, update);
  }, [ctxForm, name]);
  return ctxForm.getFieldState(name);
}

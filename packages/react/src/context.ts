import { createContext, useContext } from "react";
import type { FormApi } from "@fillament/core";

export type ComponentRegistry = Record<string, React.ComponentType<any>>;

export type FormProviderValue = {
  form: FormApi<any>;
  components: ComponentRegistry;
};

export const FormContext = createContext<FormProviderValue | null>(null);

export function useFormContext<TValues = any>(): FormApi<TValues> {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error(
      "useFormContext must be used inside a <FormProvider> or <Form form={...}>"
    );
  }
  return ctx.form as FormApi<TValues>;
}

export function useFormContextOrNull<TValues = any>(): FormApi<TValues> | null {
  const ctx = useContext(FormContext);
  return ctx ? (ctx.form as FormApi<TValues>) : null;
}

export function useComponents(): ComponentRegistry {
  const ctx = useContext(FormContext);
  return ctx?.components ?? {};
}

export function createFormUI(components: ComponentRegistry): ComponentRegistry {
  return components;
}

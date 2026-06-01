import { useMemo, type FormEvent, type ReactNode } from "react";
import type { FormApi, SubmitHandler } from "@fillament/core";
import { FormContext, type ComponentRegistry } from "./context.js";

export type FormProps<TValues> = {
  form: FormApi<TValues>;
  onSubmit?: SubmitHandler<TValues>;
  children: ReactNode;
  components?: ComponentRegistry;
  noValidate?: boolean;
  className?: string;
  id?: string;
  ["aria-label"]?: string;
};

export function Form<TValues>(props: FormProps<TValues>) {
  const { form, onSubmit, children, components = {}, noValidate = true, className, id } = props;

  if (onSubmit) {
    (form.options as { onSubmit?: SubmitHandler<TValues> }).onSubmit = onSubmit;
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void form.submit();
  };

  const ctxValue = useMemo(() => ({ form, components }), [form, components]);

  return (
    <FormContext.Provider value={ctxValue}>
      <form
        onSubmit={handleSubmit}
        noValidate={noValidate}
        className={className}
        id={id}
        aria-label={props["aria-label"]}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

export type FormProviderProps<TValues> = {
  form: FormApi<TValues>;
  components?: ComponentRegistry;
  children: ReactNode;
};

export function FormProvider<TValues>(props: FormProviderProps<TValues>) {
  const ctxValue = useMemo(
    () => ({ form: props.form, components: props.components ?? {} }),
    [props.form, props.components]
  );
  return <FormContext.Provider value={ctxValue}>{props.children}</FormContext.Provider>;
}

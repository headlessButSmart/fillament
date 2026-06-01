import { createContext, useContext, type ReactNode } from "react";
import { useFormik, type FormikBag, type FormikConfig } from "./useFormik.js";

export type FormikCompatProps<TValues extends object> = FormikConfig<TValues> & {
  children: ReactNode | ((formik: FormikBag<TValues>) => ReactNode);
};

const FormikContext = createContext<FormikBag<any> | null>(null);

export function FormikCompat<TValues extends object>(props: FormikCompatProps<TValues>) {
  const { children, ...config } = props;
  const formik = useFormik<TValues>(config);
  const rendered = typeof children === "function" ? children(formik) : children;
  return <FormikContext.Provider value={formik}>{rendered}</FormikContext.Provider>;
}

// Alias to match Formik's import name pattern: `import { Formik } from "@fillament/formik-compat";`
export const Formik = FormikCompat;

export function useFormikContext<TValues extends object = any>(): FormikBag<TValues> {
  const ctx = useContext(FormikContext);
  if (!ctx) {
    throw new Error("useFormikContext must be used inside <FormikCompat> / <Formik>");
  }
  return ctx as FormikBag<TValues>;
}

export type FieldProps = {
  field: {
    name: string;
    value: unknown;
    onChange: (e: React.ChangeEvent<any>) => void;
    onBlur: (e: React.FocusEvent<any>) => void;
  };
  form: FormikBag<any>;
  meta: ReturnType<FormikBag<any>["getFieldMeta"]>;
};

/**
 * Formik-style <Field name="..." />. Supports:
 *  - children render-prop: <Field name="email">{({ field, meta }) => ...}</Field>
 *  - `component` prop: <Field name="email" component={MyInput} />
 *  - default <input>
 */
export type FormikFieldProps = {
  name: string;
  type?: string;
  placeholder?: string;
  as?: string | React.ComponentType<any>;
  component?: React.ComponentType<any>;
  children?: (props: FieldProps) => ReactNode;
};

export function Field(props: FormikFieldProps) {
  const formik = useFormikContext();
  const fieldProps = formik.getFieldProps(props.name);
  const meta = formik.getFieldMeta(props.name);

  if (typeof props.children === "function") {
    return <>{props.children({ field: fieldProps, form: formik, meta })}</>;
  }

  if (props.component) {
    const C = props.component;
    return <C {...fieldProps} field={fieldProps} form={formik} meta={meta} />;
  }

  if (props.as && typeof props.as !== "string") {
    const C = props.as as React.ComponentType<any>;
    return <C {...fieldProps} placeholder={props.placeholder} type={props.type} />;
  }

  const tag = (props.as as string) ?? "input";
  return tag === "input" ? (
    <input {...fieldProps} type={props.type ?? "text"} placeholder={props.placeholder} value={(fieldProps.value ?? "") as any} />
  ) : tag === "textarea" ? (
    <textarea {...fieldProps} placeholder={props.placeholder} value={(fieldProps.value ?? "") as any} />
  ) : tag === "select" ? (
    <select {...fieldProps} value={(fieldProps.value ?? "") as any} />
  ) : (
    <input {...fieldProps} value={(fieldProps.value ?? "") as any} />
  );
}

/**
 * Formik-style <ErrorMessage name="..." />. Renders nothing if the field is
 * untouched or has no error.
 */
export type ErrorMessageProps = {
  name: string;
  component?: React.ElementType;
  className?: string;
  children?: (message: string) => ReactNode;
};

export function ErrorMessage(props: ErrorMessageProps) {
  const formik = useFormikContext();
  const meta = formik.getFieldMeta(props.name);
  if (!meta.touched || !meta.error) return null;
  if (typeof props.children === "function") return <>{props.children(meta.error)}</>;
  const Tag = props.component ?? "div";
  return <Tag className={props.className}>{meta.error}</Tag>;
}

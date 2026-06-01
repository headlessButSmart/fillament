import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import * as yup from "yup";
import {
  Formik,
  Field as FormikField,
  ErrorMessage,
  useFormik,
} from "@fillament/formik-compat";

const Schema = yup.object({
  email: yup.string().email("Enter a valid email").required("Email is required"),
  firstName: yup.string().required("Required"),
  lastName: yup.string().required("Required"),
});

type Values = yup.InferType<typeof Schema>;

// ---- Variant A: <Formik> render-prop, exactly like the Formik library ----

function FormikRenderPropDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  return (
    <div className="fl-demo">
      <h2>Formik render-prop migration</h2>
      <p className="subtitle">
        A Formik form rendered by <code>@fillament/formik-compat</code> — same{" "}
        <code>{`<Formik>`}</code>, <code>handleChange</code>,{" "}
        <code>handleBlur</code>, <code>handleSubmit</code> API. Change your
        imports, nothing else.
      </p>
      <Formik<Values>
        initialValues={{ email: "", firstName: "", lastName: "" }}
        validationSchema={Schema}
        onSubmit={async (values) => setSubmitted(values)}
      >
        {(formik) => (
          <form onSubmit={formik.handleSubmit}>
            <div data-fillament-field>
              <label data-fillament-label htmlFor="fc-email">Email</label>
              <input
                id="fc-email"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <ErrorMessage name="email" component="div" className="fl-error" />
            </div>
            <div data-fillament-field>
              <label data-fillament-label htmlFor="fc-first">First name</label>
              <input
                id="fc-first"
                name="firstName"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <ErrorMessage name="firstName" component="div" className="fl-error" />
            </div>
            <div data-fillament-field>
              <label data-fillament-label htmlFor="fc-last">Last name</label>
              <input
                id="fc-last"
                name="lastName"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <ErrorMessage name="lastName" component="div" className="fl-error" />
            </div>
            <button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </Formik>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
    </div>
  );
}

// ---- Variant B: useFormik hook ----

function UseFormikDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const formik = useFormik<Values>({
    initialValues: { email: "", firstName: "", lastName: "" },
    validationSchema: Schema,
    onSubmit: async (values) => setSubmitted(values),
  });

  return (
    <div className="fl-demo">
      <h2>useFormik hook</h2>
      <p className="subtitle">
        Same API as <code>formik.useFormik</code> — returns a familiar bag with
        values, errors, touched, isSubmitting, setFieldValue, resetForm, and so
        on.
      </p>
      <form onSubmit={formik.handleSubmit}>
        {(["email", "firstName", "lastName"] as const).map((name) => (
          <div data-fillament-field key={name} data-fillament-invalid={formik.touched[name] && formik.errors[name] ? true : undefined}>
            <label data-fillament-label htmlFor={`uf-${name}`}>{name}</label>
            <input
              id={`uf-${name}`}
              {...formik.getFieldProps(name)}
              value={(formik.values[name] ?? "") as string}
            />
            {formik.touched[name] && formik.errors[name] ? (
              <div data-fillament-error>{formik.errors[name]}</div>
            ) : null}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={formik.isSubmitting}>Save</button>
          <button type="button" onClick={() => formik.resetForm()}>Reset</button>
        </div>
      </form>
      <div className="fl-output">
        dirty: {String(formik.dirty)}{"  "}
        isValid: {String(formik.isValid)}{"  "}
        submitCount: {formik.submitCount}
      </div>
      {submitted ? (
        <div className="fl-output">Submitted: {JSON.stringify(submitted, null, 2)}</div>
      ) : null}
    </div>
  );
}

const meta: Meta = {
  title: "Migration/Formik compatibility",
};
export default meta;

export const FormikRenderProp: StoryObj = { render: () => <FormikRenderPropDemo /> };
export const UseFormikHook: StoryObj = { render: () => <UseFormikDemo /> };

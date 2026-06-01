import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import * as yup from "yup";
import { Formik, Field, ErrorMessage, useFormik } from "../index.js";

describe("formik-compat", () => {
  afterEach(() => cleanup());

  it("renders a Formik render-prop form and submits values", async () => {
    const onSubmit = vi.fn();
    function App() {
      return (
        <Formik<{ email: string }>
          initialValues={{ email: "" }}
          onSubmit={(values) => onSubmit(values)}
        >
          {(formik) => (
            <form onSubmit={formik.handleSubmit}>
              <input
                aria-label="Email"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <button type="submit">Save</button>
            </form>
          )}
        </Formik>
      );
    }
    render(<App />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@a" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: "a@a" });
    });
  });

  it("resolves a Yup schema to a Fillament adapter and surfaces errors", async () => {
    const { resolveValidationSchema } = await import("../schema.js");
    const Schema = yup.object({
      email: yup.string().email("invalid email").required("required"),
    });
    const adapter = resolveValidationSchema(Schema);
    expect(adapter).toBeDefined();
    expect(adapter!.type).toBe("yup");
    const result = await adapter!.validate({ email: "bad" });
    expect(result.valid).toBe(false);
    expect(result.errors.email?.[0]?.message).toBe("invalid email");
  });

  it("inline validate returns flat errors-by-path", async () => {
    function Inner() {
      const formik = useFormik<{ a: string; b: string }>({
        initialValues: { a: "", b: "" },
        validate: (values) => {
          const errors: Record<string, string> = {};
          if (!values.a) errors.a = "Required";
          return errors;
        },
        onSubmit: () => {},
      });
      return (
        <form onSubmit={formik.handleSubmit}>
          <span data-testid="err-a">{formik.errors.a ?? ""}</span>
          <button type="submit">Go</button>
        </form>
      );
    }
    render(<Inner />);
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() => {
      expect(screen.getByTestId("err-a").textContent).toBe("Required");
    });
  });
});

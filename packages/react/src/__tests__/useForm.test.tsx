import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, Form, Field } from "../index.js";

describe("useForm + Form + Field", () => {
  it("submits typed values from a basic form", async () => {
    const onSubmit = vi.fn();
    function App() {
      const form = useForm<{ email: string }>({
        defaultValues: { email: "" },
      });
      return (
        <Form form={form} onSubmit={onSubmit}>
          <Field name="email" label="Email" />
          <button type="submit">Save</button>
        </Form>
      );
    }
    render(<App />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@a" } });
    fireEvent.click(screen.getByText("Save"));
    // submit is async; wait a microtask
    await Promise.resolve();
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalled();
    const args = onSubmit.mock.calls[0]![0];
    expect(args).toEqual({ email: "a@a" });
  });

  it("does not re-render unrelated fields when one field changes", async () => {
    let aRenders = 0;
    let bRenders = 0;
    const { useField } = await import("../useField.js");
    function FieldA() {
      const f = useField("a");
      aRenders += 1;
      return (
        <input
          aria-label="A"
          value={(f.value as string) ?? ""}
          onChange={f.onChange}
          onBlur={f.onBlur}
        />
      );
    }
    function FieldB() {
      const f = useField("b");
      bRenders += 1;
      return (
        <input
          aria-label="B"
          value={(f.value as string) ?? ""}
          onChange={f.onChange}
          onBlur={f.onBlur}
        />
      );
    }
    function App() {
      const form = useForm<{ a: string; b: string }>({
        defaultValues: { a: "", b: "" },
      });
      return (
        <Form form={form} onSubmit={() => {}}>
          <FieldA />
          <FieldB />
        </Form>
      );
    }
    render(<App />);
    const baselineA = aRenders;
    const baselineB = bRenders;
    fireEvent.change(screen.getByLabelText("A"), { target: { value: "x" } });
    expect(aRenders).toBeGreaterThan(baselineA);
    expect(bRenders).toBe(baselineB);
  });
});

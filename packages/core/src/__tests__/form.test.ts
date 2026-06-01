import { describe, it, expect, vi } from "vitest";
import { createForm } from "../form.js";
import type { ValidationAdapter } from "../types.js";

describe("createForm", () => {
  it("initializes with default values", () => {
    const form = createForm<{ email: string }>({
      defaultValues: { email: "a@a" },
    });
    expect(form.getValues()).toEqual({ email: "a@a" });
    expect(form.formState.dirty).toBe(false);
  });

  it("setValue marks the field dirty and notifies subscribers", () => {
    const form = createForm<{ email: string }>({ defaultValues: { email: "" } });
    const listener = vi.fn();
    form.subscribe("email", listener);

    form.setValue("email", "new@a");

    expect(form.getValue("email")).toBe("new@a");
    expect(form.formState.dirty).toBe(true);
    expect(listener).toHaveBeenCalled();
  });

  it("subscribers receive notifications only for matching paths", () => {
    const form = createForm<{ a: string; b: string }>({ defaultValues: { a: "", b: "" } });
    const a = vi.fn();
    const b = vi.fn();
    form.subscribe("a", a);
    form.subscribe("b", b);

    form.setValue("a", "x");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(0);
  });

  it("validates with an adapter on submit and blocks on errors", async () => {
    const adapter: ValidationAdapter<{ email: string }> = {
      type: "test",
      async validate(values) {
        if (!values.email) {
          return { valid: false, errors: { email: [{ message: "Required", type: "required" }] } };
        }
        return { valid: true, errors: {} };
      },
    };
    const onSubmit = vi.fn();
    const form = createForm<{ email: string }>({
      schema: adapter,
      defaultValues: { email: "" },
      onSubmit,
    });
    await form.submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.getState().errors.email?.[0]?.message).toBe("Required");

    form.setValue("email", "ok@a");
    await form.submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("reset restores default values and clears state", () => {
    const form = createForm<{ name: string }>({ defaultValues: { name: "ana" } });
    form.setValue("name", "ben", { shouldTouch: true });
    expect(form.formState.dirty).toBe(true);

    form.reset();
    expect(form.getValue("name")).toBe("ana");
    expect(form.formState.dirty).toBe(false);
    expect(form.formState.touched).toEqual({});
  });

  it("emits analytics events on lifecycle", () => {
    const events: string[] = [];
    const form = createForm<{ name: string }>({ defaultValues: { name: "" } });
    form.subscribeAnalytics((e) => events.push(e.type));
    form.setValue("name", "x");
    expect(events).toContain("field_changed");
  });
});

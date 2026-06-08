import { describe, it, expect, vi } from "vitest";
import { createForm } from "../form.js";
import type { FillamentPlugin } from "../plugin.js";

describe("FillamentPlugin extension point", () => {
  it("invokes onInit with the form context", () => {
    const onInit = vi.fn();
    const plugin: FillamentPlugin<{ a: string }> = { name: "test", onInit };
    const form = createForm<{ a: string }>({
      defaultValues: { a: "" },
      plugins: [plugin],
    });
    expect(onInit).toHaveBeenCalledTimes(1);
    const [ctx] = onInit.mock.calls[0]!;
    expect(ctx.form).toBe(form);
    expect(ctx.formId).toBe(form.id);
  });

  it("fires onValuesChange on setValue", () => {
    const onValuesChange = vi.fn();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [{ onValuesChange }],
    });
    form.setValue("name", "Ana");
    expect(onValuesChange).toHaveBeenCalled();
    const [values] = onValuesChange.mock.calls[onValuesChange.mock.calls.length - 1]!;
    expect(values.name).toBe("Ana");
  });

  it("fires onSubmitSuccess after a successful submit", async () => {
    const onSubmitSuccess = vi.fn();
    const form = createForm<{ x: number }>({
      defaultValues: { x: 1 },
      onSubmit: async () => {},
      plugins: [{ onSubmitSuccess }],
    });
    await form.submit();
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
  });

  it("fires onSubmitError when onSubmit throws", async () => {
    const onSubmitError = vi.fn();
    const form = createForm<{ x: number }>({
      defaultValues: { x: 1 },
      onSubmit: async () => {
        throw new Error("boom");
      },
      plugins: [{ onSubmitError }],
    });
    await form.submit();
    expect(onSubmitError).toHaveBeenCalledTimes(1);
  });

  it("fires onReset", () => {
    const onReset = vi.fn();
    const form = createForm<{ x: number }>({
      defaultValues: { x: 0 },
      plugins: [{ onReset }],
    });
    form.reset();
    expect(onReset).toHaveBeenCalled();
  });

  it("swallows plugin errors without breaking the form", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const form = createForm<{ x: number }>({
      defaultValues: { x: 0 },
      plugins: [
        {
          onValuesChange: () => {
            throw new Error("kaboom");
          },
        },
      ],
    });
    expect(() => form.setValue("x", 5)).not.toThrow();
    expect(form.getValue("x")).toBe(5);
    warn.mockRestore();
  });

  it("runs onInit cleanup when __disposePlugins is called", () => {
    const cleanup = vi.fn();
    const form = createForm<{ x: number }>({
      defaultValues: { x: 0 },
      plugins: [{ onInit: () => cleanup }],
    });
    const dispose = (form as unknown as { __disposePlugins: () => void }).__disposePlugins;
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not touch behavior when plugins is omitted", () => {
    const form = createForm<{ x: number }>({ defaultValues: { x: 0 } });
    form.setValue("x", 7);
    expect(form.getValue("x")).toBe(7);
  });
});

import { describe, it, expect } from "vitest";
import { createForm } from "@fillament/core";
import { fillFormWithTestData } from "../fill.js";

const adapter = {
  type: "custom",
  validate: async (values: any) => {
    const valid = typeof values.email === "string" && values.email.includes("@");
    return {
      valid,
      errors: valid ? {} : { email: [{ message: "Invalid email" }] },
    };
  },
  introspect: () => ({
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
      age: { type: "integer", minimum: 18, maximum: 99 },
    },
  }),
};

describe("fillFormWithTestData", () => {
  it("fills values from the introspected schema and validates", async () => {
    const form = createForm({ schema: adapter, defaultValues: { email: "", age: 0 } });
    const applied = fillFormWithTestData(form, { seed: 11 });
    expect(applied.email).toContain("@");
    expect(form.getValue("email")).toBe(applied.email);
    // Validation kicked off by setValues is async — let it settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(form.getState().isValid).toBe(true);
  });

  it("keeps user-entered values with onlyEmpty", () => {
    const form = createForm({ schema: adapter, defaultValues: { email: "", age: 0 } });
    form.setValue("email", "keep@me.com");
    fillFormWithTestData(form, { seed: 11, onlyEmpty: true, validate: false });
    expect(form.getValue("email")).toBe("keep@me.com");
    // age was 0, not empty — must also be kept.
    expect(form.getValue("age")).toBe(0);
  });

  it("works without any adapter by inferring from defaults", () => {
    const form = createForm({ defaultValues: { name: "", isActive: false } });
    const applied = fillFormWithTestData(form, { seed: 2, validate: false }) as any;
    expect(typeof applied.name).toBe("string");
    expect(applied.name.length).toBeGreaterThan(0);
    expect(typeof applied.isActive).toBe("boolean");
  });
});

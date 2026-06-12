import { describe, it, expect } from "vitest";
import { createForm, createValidationAdapter, introspectForm, inferJsonSchemaFromValues } from "../index.js";

describe("inferJsonSchemaFromValues", () => {
  it("infers nested object shapes from runtime values", () => {
    const json = inferJsonSchemaFromValues({
      name: "Ada",
      age: 36,
      score: 1.5,
      active: true,
      tags: ["a"],
      address: { city: "London" },
    });
    expect(json).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        score: { type: "number" },
        active: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
        address: { type: "object", properties: { city: { type: "string" } } },
      },
    });
  });

  it("returns a permissive schema for null/undefined", () => {
    expect(inferJsonSchemaFromValues(null)).toEqual({});
    expect(inferJsonSchemaFromValues(undefined)).toEqual({});
  });
});

describe("introspectForm", () => {
  it("prefers the adapter's introspect()", () => {
    const adapter = {
      type: "custom",
      validate: async () => ({ valid: true, errors: {} }),
      introspect: () => ({ type: "object", properties: { email: { type: "string" } } }),
    };
    const form = createForm({ schema: adapter, defaultValues: { other: 1 } });
    expect(introspectForm(form)).toEqual({
      type: "object",
      properties: { email: { type: "string" } },
    });
  });

  it("falls back to default values when the adapter cannot introspect", () => {
    const adapter = createValidationAdapter(() => ({ valid: true, errors: {} }));
    const form = createForm({ schema: adapter, defaultValues: { email: "", age: 0 } });
    const json = introspectForm(form) as any;
    expect(json.type).toBe("object");
    expect(json.properties.email).toEqual({ type: "string" });
    expect(json.properties.age).toEqual({ type: "integer" });
  });

  it("falls back to value inference when introspect throws", () => {
    const adapter = {
      type: "custom",
      validate: async () => ({ valid: true, errors: {} }),
      introspect: () => {
        throw new Error("boom");
      },
    };
    const form = createForm({ schema: adapter, defaultValues: { name: "x" } });
    const json = introspectForm(form) as any;
    expect(json.properties.name).toEqual({ type: "string" });
  });

  it("returns an empty object schema when nothing is known", () => {
    const form = createForm();
    expect(introspectForm(form)).toEqual({ type: "object", properties: {} });
  });
});

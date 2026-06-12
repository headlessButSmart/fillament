import { describe, it, expect } from "vitest";
import * as yup from "yup";
import { yupAdapter, yupToJsonSchema } from "../index.js";

describe("yupToJsonSchema", () => {
  it("converts objects with required tracking and constraints", () => {
    const schema = yup.object({
      email: yup.string().email().required(),
      nickname: yup.string(),
      age: yup.number().integer().min(18).max(120).required(),
    });
    const json = yupToJsonSchema(schema) as any;
    expect(json.type).toBe("object");
    expect(json.properties.email).toMatchObject({ type: "string", format: "email" });
    expect(json.properties.age).toMatchObject({ type: "integer", minimum: 18, maximum: 120 });
    expect(json.required).toContain("email");
    expect(json.required).toContain("age");
    expect(json.required).not.toContain("nickname");
  });

  it("converts oneOf to enum and labels to descriptions", () => {
    const schema = yup.object({
      status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).label("Account status"),
    });
    const json = yupToJsonSchema(schema) as any;
    expect(json.properties.status.enum).toEqual(["ACTIVE", "INACTIVE"]);
    expect(json.properties.status.description).toBe("Account status");
  });

  it("converts arrays with item schemas", () => {
    const schema = yup.object({
      contacts: yup
        .array()
        .of(yup.object({ name: yup.string().required() }))
        .min(1),
    });
    const json = yupToJsonSchema(schema) as any;
    expect(json.properties.contacts.type).toBe("array");
    expect(json.properties.contacts.minItems).toBe(1);
    expect(json.properties.contacts.items.properties.name.type).toBe("string");
    expect(json.properties.contacts.items.required).toEqual(["name"]);
  });

  it("degrades to a permissive schema on unknown input", () => {
    expect(yupToJsonSchema(undefined)).toEqual({});
    expect(yupToJsonSchema({})).toEqual({});
  });
});

describe("yupAdapter.introspect", () => {
  it("is exposed on the adapter", () => {
    const adapter = yupAdapter(yup.object({ email: yup.string().email().required() }));
    expect(adapter.introspect).toBeTypeOf("function");
    const json = adapter.introspect!() as any;
    expect(json.properties.email.format).toBe("email");
  });
});

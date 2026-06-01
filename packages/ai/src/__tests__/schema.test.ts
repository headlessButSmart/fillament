import { describe, it, expect } from "vitest";
import { z } from "zod";
import { relaxSchemaForPartialUpdate, resolveSchema } from "../schema.js";

describe("resolveSchema", () => {
  it("returns an empty object schema when input is missing", () => {
    expect(resolveSchema()).toEqual({ type: "object", properties: {} });
  });

  it("passes through tagged JSON Schema", () => {
    const schema = { type: "object", properties: { x: { type: "string" } } };
    expect(resolveSchema({ type: "json-schema", schema })).toBe(schema);
  });

  it("builds a JSON Schema from a fields description", () => {
    const out = resolveSchema({
      type: "fields",
      fields: {
        email: { type: "string", format: "email", required: true },
        age: { type: "integer" },
      },
    });
    expect(out).toEqual({
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        age: { type: "integer" },
      },
      required: ["email"],
    });
  });

  it("derives JSON Schema from a raw Zod object", () => {
    const Schema = z.object({
      email: z.string().email(),
      age: z.number(),
      hobbies: z.array(z.string()),
      role: z.enum(["dev", "pm", "designer"]),
      nickname: z.string().optional(),
    });
    const out = resolveSchema(Schema) as Record<string, any>;
    expect(out.type).toBe("object");
    expect(out.properties.email).toEqual({ type: "string", format: "email" });
    expect(out.properties.age).toEqual({ type: "number" });
    expect(out.properties.hobbies).toEqual({ type: "array", items: { type: "string" } });
    expect(out.properties.role).toEqual({ type: "string", enum: ["dev", "pm", "designer"] });
    expect(out.required).toEqual(["email", "age", "hobbies", "role"]);
  });

  it("derives JSON Schema from a tagged zod input", () => {
    const Schema = z.object({ name: z.string() });
    const out = resolveSchema({ type: "zod", schema: Schema });
    expect((out as any).properties.name).toEqual({ type: "string" });
  });
});

describe("relaxSchemaForPartialUpdate", () => {
  it("strips top-level required arrays", () => {
    const input = {
      type: "object",
      required: ["email", "age"],
      properties: { email: { type: "string" }, age: { type: "number" } },
    };
    const out = relaxSchemaForPartialUpdate(input) as Record<string, any>;
    expect(out.required).toBeUndefined();
    expect(out.properties.email).toEqual({ type: "string" });
  });

  it("strips required arrays recursively in nested objects", () => {
    const input = {
      type: "object",
      required: ["address"],
      properties: {
        address: {
          type: "object",
          required: ["city"],
          properties: { city: { type: "string" } },
        },
      },
    };
    const out = relaxSchemaForPartialUpdate(input) as any;
    expect(out.required).toBeUndefined();
    expect(out.properties.address.required).toBeUndefined();
    expect(out.properties.address.properties.city).toEqual({ type: "string" });
  });

  it("relaxes array items recursively", () => {
    const input = {
      type: "object",
      required: ["contacts"],
      properties: {
        contacts: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "email"],
            properties: { name: { type: "string" }, email: { type: "string", format: "email" } },
          },
        },
      },
    };
    const out = relaxSchemaForPartialUpdate(input) as any;
    expect(out.required).toBeUndefined();
    expect(out.properties.contacts.items.required).toBeUndefined();
    expect(out.properties.contacts.items.properties.email.format).toBe("email");
  });

  it("drops additionalProperties:false on objects so dot-paths can pass", () => {
    const input = {
      type: "object",
      additionalProperties: false,
      properties: { email: { type: "string" } },
    };
    const out = relaxSchemaForPartialUpdate(input) as any;
    expect(out.additionalProperties).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const input = { type: "object", required: ["a"], properties: { a: { type: "string" } } };
    const before = JSON.parse(JSON.stringify(input));
    relaxSchemaForPartialUpdate(input);
    expect(input).toEqual(before);
  });

  it("preserves types, formats, and enums", () => {
    const input = {
      type: "object",
      required: ["role"],
      properties: {
        role: { type: "string", enum: ["dev", "pm"] },
        email: { type: "string", format: "email" },
        age: { type: "integer", minimum: 18 },
      },
    };
    const out = relaxSchemaForPartialUpdate(input) as any;
    expect(out.properties.role.enum).toEqual(["dev", "pm"]);
    expect(out.properties.email.format).toBe("email");
    expect(out.properties.age.minimum).toBe(18);
  });
});

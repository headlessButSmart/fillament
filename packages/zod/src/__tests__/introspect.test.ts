import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodAdapter, zodToJsonSchema } from "../index.js";

describe("zodToJsonSchema", () => {
  it("converts objects with required tracking", () => {
    const schema = z.object({
      email: z.string().email(),
      nickname: z.string().optional(),
      age: z.number().int().min(18).max(120),
    });
    expect(zodToJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        nickname: { type: "string" },
        age: { type: "integer", minimum: 18, maximum: 120 },
      },
      required: ["email", "age"],
    });
  });

  it("converts enums, literals, and unions of literals", () => {
    const schema = z.object({
      status: z.enum(["ACTIVE", "INACTIVE"]),
      kind: z.literal("user"),
      level: z.union([z.literal("LOW"), z.literal("HIGH")]),
    });
    const json = zodToJsonSchema(schema) as any;
    expect(json.properties.status).toEqual({ type: "string", enum: ["ACTIVE", "INACTIVE"] });
    expect(json.properties.kind).toEqual({ type: "string", const: "user" });
    expect(json.properties.level).toEqual({ enum: ["LOW", "HIGH"] });
  });

  it("converts nested arrays and objects with constraints", () => {
    const schema = z.object({
      contacts: z
        .array(
          z.object({
            name: z.string().min(1),
            phone: z.string().optional(),
          })
        )
        .min(1)
        .max(5),
    });
    const json = zodToJsonSchema(schema) as any;
    expect(json.properties.contacts.type).toBe("array");
    expect(json.properties.contacts.minItems).toBe(1);
    expect(json.properties.contacts.maxItems).toBe(5);
    expect(json.properties.contacts.items).toEqual({
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        phone: { type: "string" },
      },
      required: ["name"],
    });
  });

  it("keeps descriptions and unwraps defaults", () => {
    const schema = z.object({
      country: z.string().describe("ISO country code").default("US"),
    });
    const json = zodToJsonSchema(schema) as any;
    expect(json.properties.country).toEqual({ type: "string", description: "ISO country code" });
    expect(json.required).toBeUndefined();
  });

  it("degrades to a permissive schema on unknown input", () => {
    expect(zodToJsonSchema(undefined)).toEqual({});
    expect(zodToJsonSchema("nope")).toEqual({});
  });
});

describe("zodAdapter.introspect", () => {
  it("is exposed on the adapter", () => {
    const adapter = zodAdapter(z.object({ email: z.string().email() }));
    expect(adapter.introspect).toBeTypeOf("function");
    const json = adapter.introspect!() as any;
    expect(json.properties.email.format).toBe("email");
  });
});

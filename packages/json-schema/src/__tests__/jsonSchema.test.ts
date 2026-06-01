import { describe, it, expect } from "vitest";
import { jsonSchemaAdapter } from "../index.js";

const schema = {
  type: "object",
  required: ["email", "age"],
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18 },
    address: {
      type: "object",
      required: ["city"],
      properties: {
        city: { type: "string", minLength: 1 },
        zip: { type: "string" },
      },
    },
    contacts: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

describe("jsonSchemaAdapter", () => {
  it("returns errors keyed by dot-path", async () => {
    const adapter = jsonSchemaAdapter(schema);
    const result = await adapter.validate({
      email: "not-an-email",
      age: 12,
      address: { zip: "10001" },
      contacts: [{ name: "" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors["email"]?.[0]?.code).toBe("format");
    expect(result.errors["age"]?.[0]?.code).toBe("minimum");
    expect(result.errors["address.city"]?.[0]?.code).toBe("required");
    expect(result.errors["contacts.0.name"]?.[0]?.code).toBe("minLength");
  });

  it("returns valid: true for good data", async () => {
    const adapter = jsonSchemaAdapter(schema);
    const result = await adapter.validate({
      email: "a@a.com",
      age: 30,
      address: { city: "NYC", zip: "10001" },
      contacts: [{ name: "Ana" }],
    });
    expect(result.valid).toBe(true);
  });

  it("validateField scopes errors to one path", async () => {
    const adapter = jsonSchemaAdapter(schema);
    const result = await adapter.validateField!("email", "bad", {
      email: "bad",
      age: 30,
      address: { city: "NYC" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("email");
  });
});

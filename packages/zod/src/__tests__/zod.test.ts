import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodAdapter } from "../index.js";

const Schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

describe("zodAdapter", () => {
  it("returns errors keyed by field path", async () => {
    const adapter = zodAdapter(Schema);
    const result = await adapter.validate({ email: "bad", age: 12 });
    expect(result.valid).toBe(false);
    expect(result.errors.email?.[0]?.message).toBeTypeOf("string");
    expect(result.errors.age?.[0]?.message).toBeTypeOf("string");
  });

  it("returns valid: true for good data", async () => {
    const adapter = zodAdapter(Schema);
    const result = await adapter.validate({ email: "a@a.com", age: 30 });
    expect(result.valid).toBe(true);
  });

  it("validateField scopes errors to one path", async () => {
    const adapter = zodAdapter(Schema);
    const result = await adapter.validateField!("email", "bad", { email: "bad", age: 30 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toBe("email");
  });
});

import { describe, it, expect } from "vitest";
import * as yup from "yup";
import { yupAdapter } from "../index.js";

const Schema = yup.object({
  email: yup.string().email("Enter a valid email").required("Required"),
  age: yup.number().min(18, "Must be 18+").required("Required"),
  contacts: yup.array().of(
    yup.object({
      name: yup.string().required("Name required"),
    })
  ),
});

describe("yupAdapter", () => {
  it("returns errors keyed by dot-path", async () => {
    const adapter = yupAdapter(Schema);
    const result = await adapter.validate({
      email: "bad",
      age: 12,
      contacts: [{ name: "" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors["email"]?.[0]?.message).toBe("Enter a valid email");
    expect(result.errors["age"]?.[0]?.message).toBe("Must be 18+");
    expect(result.errors["contacts.0.name"]?.[0]?.message).toBe("Name required");
  });

  it("returns valid: true for good data", async () => {
    const adapter = yupAdapter(Schema);
    const result = await adapter.validate({
      email: "a@a.com",
      age: 30,
      contacts: [{ name: "Ana" }],
    });
    expect(result.valid).toBe(true);
  });

  it("validateField scopes errors to one path", async () => {
    const adapter = yupAdapter(Schema);
    const result = await adapter.validateField!("email", "bad", {
      email: "bad",
      age: 30,
      contacts: [{ name: "Ana" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toBe("Enter a valid email");
  });
});

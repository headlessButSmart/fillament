import { describe, it, expect } from "vitest";
import {
  buildChatMessages,
  extractJsonObject,
  isSensitive,
  redactValues,
  DEFAULT_SYSTEM_PROMPT,
} from "../prompt.js";

describe("isSensitive", () => {
  it("flags top-level password fields", () => {
    expect(isSensitive("password")).toBe(true);
    expect(isSensitive("ssn")).toBe(true);
  });
  it("flags nested sensitive segments", () => {
    expect(isSensitive("user.password")).toBe(true);
    expect(isSensitive("billing.cardNumber")).toBe(true);
  });
  it("returns false for safe fields", () => {
    expect(isSensitive("user.firstName")).toBe(false);
    expect(isSensitive("nickname")).toBe(false);
  });
  it("honors caller's extra redact list", () => {
    expect(isSensitive("couponCode", ["couponCode"])).toBe(true);
  });
});

describe("redactValues", () => {
  it("replaces sensitive leaf values with [REDACTED]", () => {
    const out = redactValues(
      { firstName: "Ana", password: "hunter2", billing: { cardNumber: "4242..." } },
      []
    ) as Record<string, any>;
    expect(out.firstName).toBe("Ana");
    expect(out.password).toBe("[REDACTED]");
    expect(out.billing.cardNumber).toBe("[REDACTED]");
  });
  it("walks arrays", () => {
    const out = redactValues(
      { contacts: [{ name: "Ana", password: "x" }] },
      []
    ) as { contacts: Array<{ name: string; password: string }> };
    expect(out.contacts[0]!.name).toBe("Ana");
    expect(out.contacts[0]!.password).toBe("[REDACTED]");
  });
});

describe("extractJsonObject", () => {
  it("parses plain JSON", () => {
    expect(extractJsonObject('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
  it("strips markdown fences", () => {
    const raw = '```json\n{"firstName":"Ana"}\n```';
    expect(extractJsonObject(raw)).toEqual({ firstName: "Ana" });
  });
  it("finds JSON embedded in prose", () => {
    const raw = 'Sure! Here is the data:\n{"email":"a@a.com"}\nLet me know if you need anything else.';
    expect(extractJsonObject(raw)).toEqual({ email: "a@a.com" });
  });
  it("handles nested objects with quoted braces", () => {
    const raw = 'noise{"a":{"b":"}"},"c":2}trail';
    expect(extractJsonObject(raw)).toEqual({ a: { b: "}" }, c: 2 });
  });
  it("returns null on malformed input", () => {
    expect(extractJsonObject("just words")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
});

describe("buildChatMessages", () => {
  it("uses the default system prompt when none provided", () => {
    const messages = buildChatMessages({
      schema: { type: "object", properties: { email: { type: "string" } } },
      values: { email: "" },
      request: "fill in",
    });
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(messages[1]!.role).toBe("user");
    expect(messages[1]!.content).toContain("FORM SCHEMA");
    expect(messages[1]!.content).toContain("fill in");
  });
  it("allows overriding the system prompt", () => {
    const messages = buildChatMessages({
      schema: {},
      values: {},
      request: "x",
      systemPrompt: "custom",
    });
    expect(messages[0]!.content).toBe("custom");
  });
});

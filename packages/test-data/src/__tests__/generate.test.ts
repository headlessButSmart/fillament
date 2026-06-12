import { describe, it, expect } from "vitest";
import { generateTestValues } from "../generate.js";

const schema = {
  type: "object",
  required: ["email", "age", "status"],
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18, maximum: 120 },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING"] },
    nickname: { type: "string", minLength: 3, maxLength: 10 },
    isSubscribed: { type: "boolean" },
    createdAt: {},
    contacts: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
        },
      },
    },
  },
};

describe("generateTestValues", () => {
  it("is deterministic for a given seed", () => {
    const a = generateTestValues(schema, { seed: 42 });
    const b = generateTestValues(schema, { seed: 42 });
    expect(a).toEqual(b);
    const c = generateTestValues(schema, { seed: 43 });
    expect(c).not.toEqual(a);
  });

  it("respects formats, enums, and numeric bounds", () => {
    const values = generateTestValues<any>(schema, { seed: 1 });
    expect(values.email).toMatch(/^[^@]+@[^@]+\.[a-z]+$/);
    expect(values.age).toBeGreaterThanOrEqual(18);
    expect(values.age).toBeLessThanOrEqual(120);
    expect(Number.isInteger(values.age)).toBe(true);
    expect(["ACTIVE", "INACTIVE", "PENDING"]).toContain(values.status);
    expect(typeof values.isSubscribed).toBe("boolean");
  });

  it("respects string length constraints", () => {
    for (let seed = 0; seed < 20; seed++) {
      const values = generateTestValues<any>(schema, { seed });
      expect(values.nickname.length).toBeGreaterThanOrEqual(3);
      expect(values.nickname.length).toBeLessThanOrEqual(10);
    }
  });

  it("generates epoch-ms integers for *At fields without a type", () => {
    const values = generateTestValues<any>(schema, { seed: 7 });
    expect(Number.isInteger(values.createdAt)).toBe(true);
    expect(values.createdAt).toBeGreaterThan(Date.now() - 366 * 24 * 60 * 60 * 1000);
    expect(values.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it("respects array bounds and generates item objects", () => {
    const values = generateTestValues<any>(schema, { seed: 3 });
    expect(values.contacts).toHaveLength(2);
    expect(typeof values.contacts[0].name).toBe("string");
    expect(values.contacts[0].phone).toMatch(/^\+1\d+$/);
  });

  it("applies overrides by dot-path, including inside arrays", () => {
    const values = generateTestValues<any>(schema, {
      seed: 5,
      overrides: {
        email: "pinned@example.com",
        "contacts.0.name": "Pinned Name",
        age: (rng) => rng.int(30, 30),
      },
    });
    expect(values.email).toBe("pinned@example.com");
    expect(values.contacts[0].name).toBe("Pinned Name");
    expect(values.age).toBe(30);
  });

  it("skips optional properties when includeOptional is false", () => {
    const values = generateTestValues<any>(schema, { seed: 5, includeOptional: false });
    expect(Object.keys(values).sort()).toEqual(["age", "email", "status"]);
  });

  it("honors const and falls back gracefully on empty schemas", () => {
    const values = generateTestValues<any>(
      { type: "object", properties: { kind: { const: "user" }, anything: {} } },
      { seed: 1 }
    );
    expect(values.kind).toBe("user");
    expect(values.anything).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import { compileVisibilityExpression, resolveVisibility } from "../visibility.js";

describe("visibility expressions", () => {
  it("evaluates equality and logical operators", () => {
    const fn = compileVisibilityExpression("hasCompany === true && company.name !== ''");
    expect(fn({ hasCompany: true, company: { name: "x" } })).toBe(true);
    expect(fn({ hasCompany: false, company: { name: "x" } })).toBe(false);
    expect(fn({ hasCompany: true, company: { name: "" } })).toBe(false);
  });

  it("handles parentheses and unary not", () => {
    const fn = compileVisibilityExpression("!(a === 0)");
    expect(fn({ a: 1 })).toBe(true);
    expect(fn({ a: 0 })).toBe(false);
  });

  it("supports numeric comparisons", () => {
    const fn = compileVisibilityExpression("age >= 18");
    expect(fn({ age: 21 })).toBe(true);
    expect(fn({ age: 16 })).toBe(false);
  });

  it("resolves function predicates", () => {
    const result = resolveVisibility(({ values }: any) => values.toggle, { toggle: true });
    expect(result).toBe(true);
  });

  it("returns true when no predicate", () => {
    expect(resolveVisibility(undefined, {})).toBe(true);
  });
});

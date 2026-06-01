import { describe, it, expect } from "vitest";
import {
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  hasPath,
  isEqual,
  parsePath,
  isPathUnder,
} from "../path.js";

describe("path utilities", () => {
  describe("parsePath", () => {
    it("parses dot-separated paths and detects numeric segments", () => {
      expect(parsePath("user.address.city")).toEqual(["user", "address", "city"]);
      expect(parsePath("contacts.0.email")).toEqual(["contacts", 0, "email"]);
      expect(parsePath("")).toEqual([]);
    });
  });

  describe("getValueAtPath", () => {
    it("walks nested objects and arrays", () => {
      const obj = { user: { name: "ana", contacts: [{ email: "a@a" }] } };
      expect(getValueAtPath(obj, "user.name")).toBe("ana");
      expect(getValueAtPath(obj, "user.contacts.0.email")).toBe("a@a");
      expect(getValueAtPath(obj, "user.missing")).toBeUndefined();
    });
  });

  describe("setValueAtPath", () => {
    it("creates intermediate objects without mutating the input", () => {
      const input = { user: { name: "ana" } };
      const out = setValueAtPath(input, "user.address.city", "NYC");
      expect(out).toEqual({ user: { name: "ana", address: { city: "NYC" } } });
      expect(input).toEqual({ user: { name: "ana" } });
    });

    it("creates arrays when the next segment is numeric", () => {
      const out = setValueAtPath({} as any, "contacts.0.email", "a@a");
      expect(out).toEqual({ contacts: [{ email: "a@a" }] });
    });

    it("overwrites existing values", () => {
      const out = setValueAtPath({ a: 1 }, "a", 2);
      expect(out).toEqual({ a: 2 });
    });
  });

  describe("deleteValueAtPath", () => {
    it("removes object keys without mutating input", () => {
      const input = { a: 1, b: 2 };
      const out = deleteValueAtPath(input, "a");
      expect(out).toEqual({ b: 2 });
      expect(input).toEqual({ a: 1, b: 2 });
    });

    it("splices array elements", () => {
      const input = { list: [1, 2, 3] };
      const out = deleteValueAtPath(input, "list.1");
      expect(out).toEqual({ list: [1, 3] });
    });
  });

  describe("hasPath", () => {
    it("returns true only when every segment exists", () => {
      expect(hasPath({ a: { b: 1 } }, "a.b")).toBe(true);
      expect(hasPath({ a: { b: 1 } }, "a.c")).toBe(false);
      expect(hasPath({ a: null }, "a.b")).toBe(false);
    });
  });

  describe("isEqual", () => {
    it("deep-compares nested structures", () => {
      expect(isEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
      expect(isEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
      expect(isEqual(null, null)).toBe(true);
      expect(isEqual(0, "0" as any)).toBe(false);
    });
  });

  describe("isPathUnder", () => {
    it("matches subpaths but not unrelated prefixes", () => {
      expect(isPathUnder("address", "address.city")).toBe(true);
      expect(isPathUnder("address", "address")).toBe(true);
      expect(isPathUnder("addr", "address.city")).toBe(false);
      expect(isPathUnder("", "any.path")).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import { createForm } from "../form.js";
import { createFieldArray } from "../fieldArray.js";

type Form = { contacts: Array<{ name: string; email: string }> };

describe("fieldArray", () => {
  it("appends with stable keys", () => {
    const form = createForm<Form>({ defaultValues: { contacts: [] } });
    let arr = createFieldArray<{ name: string; email: string }>(form, "contacts");
    arr.append({ name: "ana", email: "a@a" });

    arr = createFieldArray(form, "contacts");
    const keyA = arr.items[0]!.key;

    arr.append({ name: "ben", email: "b@b" });
    arr = createFieldArray(form, "contacts");
    expect(arr.items[0]!.key).toBe(keyA);
    expect(arr.length).toBe(2);
  });

  it("remove cleans state at the removed index and shifts later items", () => {
    const form = createForm<Form>({
      defaultValues: {
        contacts: [
          { name: "a", email: "a@a" },
          { name: "b", email: "b@b" },
          { name: "c", email: "c@c" },
        ],
      },
    });
    form.setFieldTouched("contacts.1.name", true);
    form.setFieldError("contacts.1.email", "bad");

    let arr = createFieldArray(form, "contacts");
    arr.remove(0);

    const state = form.getState();
    // contacts.1.name should now sit at contacts.0.name
    expect(state.touched["contacts.0.name"]).toBe(true);
    expect(state.errors["contacts.0.email"]?.[0]?.message).toBe("bad");
    expect(state.touched["contacts.1.name"]).toBeUndefined();
  });

  it("move preserves item identity by key", () => {
    const form = createForm<Form>({
      defaultValues: {
        contacts: [
          { name: "a", email: "a@a" },
          { name: "b", email: "b@b" },
          { name: "c", email: "c@c" },
        ],
      },
    });
    let arr = createFieldArray(form, "contacts");
    const keys = arr.items.map((i) => i.key);
    arr.move(0, 2);

    arr = createFieldArray(form, "contacts");
    expect(arr.items.map((i) => i.value.name)).toEqual(["b", "c", "a"]);
    expect(arr.items.map((i) => i.key)).toEqual([keys[1], keys[2], keys[0]]);
  });
});

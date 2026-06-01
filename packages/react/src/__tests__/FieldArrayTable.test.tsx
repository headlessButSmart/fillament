import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useForm, Form, FieldArrayTable } from "../index.js";

type Values = { contacts: Array<{ name: string; email: string }> };

function App() {
  const form = useForm<Values>({
    defaultValues: {
      contacts: [
        { name: "Ana", email: "a@a.com" },
        { name: "Ben", email: "b@b.com" },
      ],
    },
  });
  return (
    <Form form={form} onSubmit={() => {}}>
      <FieldArrayTable<{ name: string; email: string }>
        name="contacts"
        columns={[
          { name: "name", label: "Name" },
          { name: "email", label: "Email", type: "email" },
        ]}
        addLabel="+ Add"
        newRow={() => ({ name: "", email: "" })}
      />
    </Form>
  );
}

describe("FieldArrayTable", () => {
  afterEach(() => cleanup());

  it("renders one row per array item with one input per column", () => {
    render(<App />);
    const rows = screen.getAllByRole("row");
    // header + 2 data rows
    expect(rows.length).toBe(3);
    expect(screen.getByDisplayValue("Ana")).toBeTruthy();
    expect(screen.getByDisplayValue("a@a.com")).toBeTruthy();
    expect(screen.getByDisplayValue("Ben")).toBeTruthy();
  });

  it("appends a blank row when Add is clicked", () => {
    render(<App />);
    fireEvent.click(screen.getByText("+ Add"));
    // Now 3 data rows + header
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(4);
  });

  it("removes a row when Remove is clicked", () => {
    render(<App />);
    const removes = screen.getAllByLabelText("Remove row");
    expect(removes.length).toBe(2);
    fireEvent.click(removes[0]!);
    // Header + 1 data row
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(2);
    // Surviving row should be Ben (not Ana)
    expect(screen.queryByDisplayValue("Ana")).toBeNull();
    expect(screen.getByDisplayValue("Ben")).toBeTruthy();
  });

  it("disables the up button on the first row and down on the last", () => {
    render(<App />);
    const ups = screen.getAllByLabelText("Move row up") as HTMLButtonElement[];
    const downs = screen.getAllByLabelText("Move row down") as HTMLButtonElement[];
    expect(ups[0]!.disabled).toBe(true);
    expect(downs[downs.length - 1]!.disabled).toBe(true);
  });
});

import type { Meta, StoryObj } from "@storybook/react";
import { useState, useSyncExternalStore } from "react";
import { Form, Field, useForm } from "@fillament/react";
import { createI18n } from "@fillament/i18n";

const messages = {
  en: {
    "user.email.label": "Email",
    "user.email.placeholder": "you@company.com",
    "user.email.required": "Email is required",
    "user.firstName.label": "First name",
    "submit": "Save",
  },
  pt: {
    "user.email.label": "Email",
    "user.email.placeholder": "tu@empresa.com",
    "user.email.required": "O email é obrigatório",
    "user.firstName.label": "Nome",
    "submit": "Guardar",
  },
  es: {
    "user.email.label": "Correo",
    "user.email.placeholder": "tu@empresa.com",
    "user.email.required": "El correo es obligatorio",
    "user.firstName.label": "Nombre",
    "submit": "Guardar",
  },
};

function LocalizedFormDemo() {
  const [i18n] = useState(() =>
    createI18n({
      locale: "en",
      fallbackLocale: "en",
      messages: messages as any,
    })
  );
  const [, force] = useState(0);
  useSyncExternalStore(
    (cb) => i18n.subscribe(cb),
    () => i18n.locale,
    () => i18n.locale
  );

  const form = useForm<{ email: string; firstName: string }>({
    defaultValues: { email: "", firstName: "" },
  });

  return (
    <div className="fl-demo">
      <h2>{i18n.t({ key: "user.email.label", fallback: "Email" })} + locale switcher</h2>
      <p className="subtitle">All labels and placeholders resolve through <code>@fillament/i18n</code>.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["en", "pt", "es"] as const).map((loc) => (
          <button
            key={loc}
            onClick={() => {
              i18n.setLocale(loc);
              force((c) => c + 1);
            }}
            style={{
              padding: "4px 12px",
              fontWeight: i18n.locale === loc ? "bold" : "normal",
            }}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
      <Form form={form} onSubmit={async (v) => alert(JSON.stringify(v))}>
        <Field
          name="email"
          label={i18n.t({ key: "user.email.label", fallback: "Email" })}
          placeholder={i18n.t({ key: "user.email.placeholder", fallback: "you@company.com" })}
          type="email"
          required
        />
        <Field
          name="firstName"
          label={i18n.t({ key: "user.firstName.label", fallback: "First name" })}
          required
        />
        <button type="submit">{i18n.t({ key: "submit", fallback: "Save" })}</button>
      </Form>
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/I18n",
};
export default meta;

type Story = StoryObj;

export const LocalizedLabels: Story = { render: () => <LocalizedFormDemo /> };
export const LocaleSwitcher: Story = { render: () => <LocalizedFormDemo /> };

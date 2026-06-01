import { useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { Highlight } from "./code.js";
import { STORYBOOK_URL, GITHUB_URL } from "./config.js";

const Schema = z.object({
  email: z.string().min(1, "Required").email("Enter a valid email"),
  firstName: z.string().min(1, "Required"),
  newsletter: z.boolean().optional(),
});
type Values = z.infer<typeof Schema>;

// ---- Code samples used across the page ----

const HERO_CODE = `import { z } from "zod";
import { useForm, Form, Field } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";

const UserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
});

export function UserForm() {
  const form = useForm({
    schema: zodAdapter(UserSchema),
    defaultValues: { email: "", firstName: "" },
  });

  return (
    <Form form={form} onSubmit={save}>
      <Field name="email" label="Email" type="email" />
      <Field name="firstName" label="First name" />
      <button type="submit">Save</button>
    </Form>
  );
}`;

const SAMPLES: Record<string, { filename: string; code: string }> = {
  zod: {
    filename: "with-zod.tsx",
    code: `import { z } from "zod";
import { zodAdapter } from "@fillament/zod";

const Schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const form = useForm({
  schema: zodAdapter(Schema),
});`,
  },
  yup: {
    filename: "with-yup.tsx",
    code: `import * as yup from "yup";
import { yupAdapter } from "@fillament/yup";

const Schema = yup.object({
  email: yup.string().email().required(),
  age: yup.number().min(18).required(),
});

const form = useForm({
  schema: yupAdapter(Schema),
});`,
  },
  "json-schema": {
    filename: "with-json-schema.tsx",
    code: `import { jsonSchemaAdapter } from "@fillament/json-schema";

const schema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18 },
  },
};

const form = useForm({
  schema: jsonSchemaAdapter(schema),
});`,
  },
  custom: {
    filename: "with-custom.tsx",
    code: `// Inline — Formik-style validate
const form = useForm({
  validate: (values) => {
    const errors = {};
    if (!values.email) errors.email = "Required";
    return errors;
  },
});

// Or a full ValidationAdapter
const adapter = createValidationAdapter(async (values) => {
  if (await isTaken(values.username)) {
    return { valid: false, errors: {
      username: [{ message: "Taken", code: "taken" }],
    }};
  }
  return { valid: true, errors: {} };
});`,
  },
};

const CONDITIONAL_CODE = `<Field name="accountType" as="Select" />

<Field
  name="company.name"
  visibleWhen="accountType === 'business'"
  unmountBehavior="preserve"
/>

<Field
  name="company.taxId"
  visibleWhen={({ values }) => values.accountType === "business"}
/>`;

const JSON_FIELDS_CODE = `const fields: FieldConfig[] = [
  { name: "fullName", type: "text", required: true },
  { name: "accountType", type: "select", options: [
    { label: "Personal", value: "personal" },
    { label: "Business", value: "business" },
  ]},
  { name: "company", type: "group",
    visibleWhen: "accountType === 'business'",
    fields: [{ name: "name", required: true }],
  },
];

<FieldsRenderer fields={fields} />`;

const AI_CODE = `import { FillamentAI } from "@fillament/ai";

<FillamentAI
  form={form}
  enabled
  model="Llama-3.2-3B-Instruct-q4f32_1-MLC"
  modelParams={{ temperature: 0.4, max_tokens: 512 }}
  schemaForAI={{ type: "zod", schema: UserSchema }}
  redact={["password"]}
  position="bottom-right"
/>`;

const ARRAY_TABLE_CODE = `<FieldArrayTable
  name="contacts"
  columns={[
    { name: "name", label: "Name", width: 200 },
    { name: "email", label: "Email", type: "email" },
    { name: "role", label: "Role", options: [
      { label: "Developer", value: "dev" },
      { label: "Designer", value: "designer" },
    ]},
    { name: "active", label: "Active", type: "checkbox" },
  ]}
  newRow={() => ({ name: "", email: "", role: "dev" })}
  minRows={1}
  maxRows={20}
  addLabel="+ Add contact"
/>`;

export function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <ValidationSection />
      <AISection />
      <ConditionalSection />
      <ArrayTableSection />
      <JsonFieldsSection />
      <UseCases />
      <Comparison />
      <MigrationBanner />
      <Packages />
      <FinalCta />
      <Footer />
    </>
  );
}

/* ---------------------------------- Nav --------------------------------- */

function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <a href="#" className="nav-brand">
          <span className="nav-brand-mark">F</span>
          Fillament
          <span className="nav-version">v0.1</span>
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#ai">AI Fill</a>
          <a href="#validation">Validation</a>
          <a href="#compare">Compare</a>
          <a href="#packages">Packages</a>
          <a
            className="nav-github"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GhIcon /> GitHub
          </a>
          <a className="nav-cta" href="#install">Get started →</a>
        </div>
      </div>
    </nav>
  );
}

function GhIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  return (
    <header className="hero">
      <div className="container hero-inner">
        <div>
          <div className="hero-badge">
            <span className="tag live">v0.1 SHIPPED</span>
            <span>Open source · MIT</span>
          </div>
          <h1>
            The form library<br />
            for teams that <span className="accent">ship complex flows.</span>
          </h1>
          <p className="hero-lede">
            Type-safe field paths, granular re-renders, first-class conditional
            fields, free DevTools, privacy-safe analytics, and a drop-in Formik
            compatibility layer. Built for React teams that take forms
            seriously.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#install">
              Get started <span>→</span>
            </a>
            <a className="btn btn-secondary" href={STORYBOOK_URL} target="_blank" rel="noreferrer">
              Open Storybook
            </a>
            <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <GhIcon /> Star on GitHub
            </a>
          </div>
          <div className="hero-install" id="install">
            <span className="prompt">$</span>
            <span>pnpm add @fillament/react @fillament/zod @fillament/devtools</span>
            <button onClick={() => navigator.clipboard?.writeText("pnpm add @fillament/react @fillament/zod @fillament/devtools")}>
              Copy
            </button>
          </div>
          <div className="hero-trust">
            <div className="hero-trust-item">
              <span className="num">68<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>/68</span></span>
              <span className="label">Tests passing</span>
            </div>
            <div className="hero-trust-item">
              <span className="num">~27<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>KB</span></span>
              <span className="label">core + react gzipped</span>
            </div>
            <div className="hero-trust-item">
              <span className="num">9<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>/10</span></span>
              <span className="label">Packages shipped</span>
            </div>
            <div className="hero-trust-item">
              <span className="num">100<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>%</span></span>
              <span className="label">TypeScript, strict</span>
            </div>
          </div>
        </div>
        <CodeWindow filename="UserForm.tsx" code={HERO_CODE} tabs={["UserForm.tsx"]} active="UserForm.tsx" />
      </div>
    </header>
  );
}

/* ---------------------------- Stats band ----------------------------- */

function Stats() {
  const items = [
    { num: "0", suffix: " ms", label: "Re-render unrelated fields", accent: true },
    { num: "5", suffix: " adapters", label: "Validation: Zod · Yup · JSON Schema · Custom · Inline" },
    { num: "9", suffix: " event types", label: "Privacy-safe analytics built in" },
    { num: "1", suffix: "-line", label: "DevTools attach: <FillamentDevTools form={form} />" },
  ];
  return (
    <section className="stats" style={{ padding: 0 }}>
      <div className="container" style={{ padding: 0 }}>
        <div className="stats-grid">
          {items.map((s, i) => (
            <div key={i} className="stat">
              <div className="stat-num">
                {s.accent ? <span className="accent">{s.num}</span> : s.num}
                <span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>{s.suffix}</span>
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Feature grid ---------------------------- */

function Features() {
  const items: Array<{ icon: string; title: string; body: string }> = [
    { icon: "◇", title: "Type-safe field paths", body: "Field names are inferred from your value type. Typos and renames caught at compile time." },
    { icon: "⚡", title: "Granular re-renders", body: "Typing in one field re-renders only the components subscribed to that field. Verified at 500 fields." },
    { icon: "✦", title: "AI form fill, in-browser", body: "WebLLM runs the model on the user's device. No keys, no costs, no values leave the browser. Preview before apply." },
    { icon: "◐", title: "Conditional fields", body: "visibleWhen with safe expression strings or predicates. Three unmount strategies per field." },
    { icon: "≡", title: "Stable field arrays", body: "Per-row keys independent of index — field state follows rows across reorder, insert, and remove." },
    { icon: "⊞", title: "Spreadsheet-style tables", body: "FieldArrayTable: each row is an array item, each column a typed sub-field. Move, remove, min/max rows." },
    { icon: "✓", title: "Any validator", body: "Zod, Yup, JSON Schema, or your own adapter. Compose schema + inline rules at the same time." },
    { icon: "{ }", title: "JSON-driven forms", body: "Load both field layout and validation from JSON. Perfect for CMS-driven or per-tenant forms." },
    { icon: "◉", title: "Free DevTools", body: "Floating panel with values, fields, errors, validation timing, render counts, and event streams." },
    { icon: "◈", title: "Privacy-safe analytics", body: "Never sends values. Auto-redacts password, email, ssn, cvv, iban, dob. Free, included." },
    { icon: "↻", title: "Formik drop-in", body: "Swap one import. <Formik>, useFormik, getFieldProps, ErrorMessage — all there." },
    { icon: "🌐", title: "SSR-ready", body: "Next.js (App + Pages), Remix, Vite, plain SPA. No window access during render, no hydration warnings." },
  ];

  return (
    <section id="features">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Why Fillament</div>
          <h2 className="section-title">Built for the forms that matter.</h2>
          <p className="section-lede">
            Nine things that make a difference once your forms grow past a login screen.
            Onboarding, checkout, insurance, finance, healthcare, admin.
          </p>
        </div>
        <div className="features">
          {items.map((f) => (
            <article className="feature" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Validation tabs ---------------------------- */

function ValidationSection() {
  const [tab, setTab] = useState<keyof typeof SAMPLES>("zod");
  const sample = SAMPLES[tab];

  return (
    <section id="validation" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Validation</div>
          <h2 className="section-title">Pick a validator. Or all of them.</h2>
          <p className="section-lede">
            Adapters for Zod, Yup, and JSON Schema ship in the box. Bring your own
            adapter for server checks or domain rules. Mix schema-based and inline
            validation on the same form.
          </p>
        </div>
        <div>
          <div className="tabs-bar" role="tablist">
            {(Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                {key === "json-schema" ? "JSON Schema" : key[0]!.toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
          <CodeWindow filename={sample!.filename} code={sample!.code} tabs={[sample!.filename]} active={sample!.filename} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Conditional fields -------------------------- */

function ConditionalSection() {
  return (
    <section>
      <div className="container">
        <div className="split">
          <div className="copy">
            <div className="eyebrow">Conditional flows</div>
            <h2>Show, hide, <span style={{ color: "var(--accent)" }}>preserve</span>.</h2>
            <p>
              First-class conditional fields with a safe expression language. No <code>eval</code>,
              no surprises. Pick what happens when a field unmounts.
            </p>
            <ul className="copy-list">
              <li><span><code>preserve</code> — keep values when hidden (default)</span></li>
              <li><span><code>clear</code> — wipe values, keep errors</span></li>
              <li><span><code>clear-and-unvalidate</code> — wipe values <em>and</em> errors</span></li>
              <li><span>Use a string expression or a typed predicate function</span></li>
            </ul>
          </div>
          <CodeWindow filename="conditional.tsx" code={CONDITIONAL_CODE} tabs={["conditional.tsx"]} active="conditional.tsx" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- AI Fill --------------------------------- */

function AISection() {
  return (
    <section id="ai" className="ai-section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">New in v0.1</div>
          <h2 className="section-title">AI form fill, with zero servers.</h2>
          <p className="section-lede">
            Let users describe what they want in plain language. A model runs
            <strong> entirely in their browser</strong> via{" "}
            <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noreferrer">WebLLM</a>{" "}
            and proposes a JSON patch matching your schema. They review, they apply.
            No keys, no API costs, no values leave the device.
          </p>
        </div>
        <div className="split">
          <AIPanelMock />
          <div className="copy">
            <h2 style={{ marginBottom: 18 }}>One drop-in component.</h2>
            <CodeWindow filename="UserForm.tsx" code={AI_CODE} tabs={["UserForm.tsx"]} active="UserForm.tsx" />
            <ul className="copy-list" style={{ marginTop: 24 }}>
              <li><span>Pluggable: pass any <a href="https://github.com/mlc-ai/web-llm#model-list" target="_blank" rel="noreferrer">WebLLM model</a> ID — small phi, mid-size llama, or your own</span></li>
              <li><span>Schema-aware: Zod, JSON Schema, or a plain <code>fields</code> description</span></li>
              <li><span>Privacy guardrails: <code>password</code> / <code>ssn</code> / <code>cvv</code> / <code>iban</code> / <code>dob</code> redacted before the model ever sees them</span></li>
              <li><span>Always opt-in: pass <code>enabled={"{flag}"}</code> to gate per-form, per-user, per-flag</span></li>
              <li><span>Tree-shakable: <code>@mlc-ai/web-llm</code> is an optional peer dep loaded with dynamic <code>import()</code></span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIPanelMock() {
  return (
    <div className="ai-mock">
      <div className="ai-mock-chrome">
        <div className="ai-mock-dot ai-mock-dot--accent" />
        <span className="ai-mock-title">Fill with AI</span>
        <span className="ai-mock-badge">Llama-3.2-3B</span>
      </div>
      <div className="ai-mock-body">
        <div className="ai-mock-progress">
          <div className="ai-mock-bar">
            <div style={{ width: "100%" }} />
          </div>
          <div className="ai-mock-progress-text">Model ready · cached in IndexedDB</div>
        </div>

        <div className="ai-mock-suggest">
          <div className="ai-mock-suggest-head">
            <span>Proposed changes · 5</span>
            <span>just now</span>
          </div>
          <div className="ai-mock-suggest-rows">
            {[
              ["fullName", "Ana López"],
              ["email", "ana.lopez@acme.dev"],
              ["role", "dev"],
              ["city", "Madrid"],
              ["yearsOfExperience", "6"],
            ].map(([k, v]) => (
              <div className="ai-mock-row" key={k}>
                <div className="ai-mock-key">{k}</div>
                <div className="ai-mock-val">{v}</div>
              </div>
            ))}
            <div className="ai-mock-row ai-mock-row--skip">
              <div className="ai-mock-key">password</div>
              <div className="ai-mock-val">— skipped (redacted) —</div>
            </div>
          </div>
          <div className="ai-mock-actions">
            <button className="ai-mock-btn ai-mock-btn--ghost">Discard</button>
            <button className="ai-mock-btn ai-mock-btn--primary">Apply 5 changes</button>
          </div>
        </div>

        <div className="ai-mock-input">
          <span>“I’m a 6yr backend dev based in Madrid, ana.lopez@acme.dev”</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Array table ------------------------------- */

function ArrayTableSection() {
  return (
    <section className="alt">
      <div className="container">
        <div className="split">
          <div className="copy">
            <div className="eyebrow">Spreadsheet-style editing</div>
            <h2>
              Field arrays, as a{" "}
              <span style={{ color: "var(--accent)" }}>table</span>.
            </h2>
            <p>
              When you have a flat array of objects — contacts, line items, milestones —
              <code>{" "}{`<FieldArrayTable>`}</code>{" "}renders each item as a row, each
              column as a typed sub-field. Move up / down, remove, with{" "}
              <code>minRows</code> / <code>maxRows</code> enforced.
            </p>
            <ul className="copy-list">
              <li><span>Columns are typed (text, number, select, checkbox, date, custom)</span></li>
              <li><span>Per-row actions are built-in with <code>aria-label</code>s and edge-disabled states</span></li>
              <li><span>Custom <code>render</code> per cell for power users</span></li>
              <li><span>Also available declaratively via <code>{`<FieldsRenderer>`}</code> as <code>type: "table"</code></span></li>
            </ul>
          </div>
          <ArrayTableMock />
        </div>
        <div style={{ marginTop: 40 }}>
          <CodeWindow filename="contacts.tsx" code={ARRAY_TABLE_CODE} tabs={["contacts.tsx"]} active="contacts.tsx" />
        </div>
      </div>
    </section>
  );
}

function ArrayTableMock() {
  const rows = [
    { name: "Ana López", email: "ana@acme.com", role: "Developer", active: true },
    { name: "Ben Chen", email: "ben@acme.com", role: "Product Manager", active: false },
    { name: "Mei Tanaka", email: "mei@acme.com", role: "Designer", active: true },
  ];
  return (
    <div className="table-mock">
      <div className="table-mock-chrome">
        <span className="table-mock-title">FieldArrayTable · contacts</span>
        <span className="table-mock-pill">3 rows</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.email}>
              <td><div className="table-mock-cell">{r.name}</div></td>
              <td><div className="table-mock-cell">{r.email}</div></td>
              <td><div className="table-mock-cell table-mock-select">{r.role} <span>▾</span></div></td>
              <td><div className={"table-mock-check " + (r.active ? "on" : "")} /></td>
              <td>
                <div className="table-mock-actions">
                  <button disabled={i === 0} aria-label="Move up">↑</button>
                  <button disabled={i === rows.length - 1} aria-label="Move down">↓</button>
                  <button aria-label="Remove">✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-mock-add">+ Add contact</div>
    </div>
  );
}

/* ------------------------------- JSON fields ------------------------------- */

function JsonFieldsSection() {
  return (
    <section className="alt">
      <div className="container">
        <div className="split reverse">
          <div className="copy">
            <div className="eyebrow">Dynamic forms</div>
            <h2>Render forms from <span style={{ color: "var(--accent)" }}>JSON</span>.</h2>
            <p>
              Load both the field layout AND the validation schema from a CMS or API.
              Perfect for per-tenant configuration, no-code-ish builders, or letting
              non-engineers ship new forms.
            </p>
            <ul className="copy-list">
              <li><span>Group nested fields with <code>type: "group"</code></span></li>
              <li><span>Render variable-length lists with <code>type: "array"</code></span></li>
              <li><span>Wire conditional visibility with an expression string</span></li>
              <li><span>Pair with <code>jsonSchemaAdapter</code> for JSON-only forms</span></li>
            </ul>
          </div>
          <CodeWindow filename="fields.json.tsx" code={JSON_FIELDS_CODE} tabs={["fields.json.tsx"]} active="fields.json.tsx" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Use cases ------------------------------- */

function UseCases() {
  const items: Array<{ icon: string; title: string; body: string; tags: string[] }> = [
    {
      icon: "▣",
      title: "Onboarding & signup",
      body: "Multi-step wizards with hidden-step preservation, server-validated usernames, conditional progressive disclosure.",
      tags: ["wizard", "server validation", "conditional"],
    },
    {
      icon: "◭",
      title: "Checkout & billing",
      body: "Address fields with country-conditional zip rules, saved cards, coupon validation, complex tax calculations.",
      tags: ["conditional", "currency", "redaction"],
    },
    {
      icon: "▦",
      title: "Admin panels & CRUD",
      body: "Dynamic field lists from a schema, role-based read-only, deep-nested editing, bulk operations across rows.",
      tags: ["JSON-driven", "field arrays", "DevTools"],
    },
  ];
  return (
    <section>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Use cases</div>
          <h2 className="section-title">Where teams reach for Fillament.</h2>
        </div>
        <div className="usecases">
          {items.map((u) => (
            <div className="usecase" key={u.title}>
              <div className="usecase-icon">{u.icon}</div>
              <h3>{u.title}</h3>
              <p>{u.body}</p>
              <div className="usecase-tags">
                {u.tags.map((t) => <span className="usecase-tag" key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Comparison ------------------------------- */

function Comparison() {
  return (
    <section id="compare" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Comparison</div>
          <h2 className="section-title">How Fillament compares.</h2>
          <p className="section-lede">
            A fair shake. Fillament isn&apos;t always the right tool — for large
            TypeScript React teams shipping complex flows, it earns its keep.
          </p>
        </div>
        <div className="compare">
          <table>
            <thead>
              <tr>
                <th>Capability</th>
                <th className="col-fillament">Fillament</th>
                <th>Formik</th>
                <th>React Hook Form</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Type-safe field paths" v={["yes", "partial", "yes"]} />
              <Row label="Renders only the changed field" v={["yes", "no", "yes"]} />
              <Row label="First-class conditional fields" v={["yes", "no", "partial"]} />
              <Row label="Field array reorder preserves state" v={["yes", "partial", "yes"]} />
              <Row label="Spreadsheet-style array tables" v={["yes", "no", "no"]} />
              <Row label="JSON Schema validation" v={["yes", "partial", "yes"]} />
              <Row label="Yup validation" v={["yes", "yes", "yes"]} />
              <Row label="Zod validation" v={["yes", "partial", "yes"]} />
              <Row label="Free in-app DevTools" v={["yes", "no", "pay"]} />
              <Row label="Privacy-safe analytics" v={["yes", "no", "no"]} />
              <Row label="JSON-driven field rendering" v={["yes", "no", "partial"]} />
              <Row label="In-browser AI form fill" v={["yes", "no", "no"]} />
              <Row label="Formik drop-in compatibility" v={["yes", "—", "no"]} />
            </tbody>
          </table>
        </div>
        <div className="compare-legend">
          <span><span className="yes">●</span> Supported</span>
          <span><span className="partial">●</span> Partial</span>
          <span><span className="no">●</span> Not supported</span>
          <span><span className="pay">$</span> Paid</span>
        </div>
      </div>
    </section>
  );
}

function Row({ label, v }: { label: string; v: Array<"yes" | "no" | "partial" | "pay" | "—"> }) {
  const symbol: Record<string, string> = { yes: "●", no: "●", partial: "●", pay: "$", "—": "—" };
  return (
    <tr>
      <td>{label}</td>
      {v.map((x, i) => (
        <td key={i} className={i === 0 ? `col-fillament ${x}` : x === "—" ? "no" : x}>
          {symbol[x]}
        </td>
      ))}
    </tr>
  );
}

/* --------------------------- Migration banner --------------------------- */

function MigrationBanner() {
  return (
    <section>
      <div className="container">
        <div className="banner">
          <div className="banner-inner">
            <div>
              <div className="eyebrow" style={{ color: "#818cf8" }}>Migrating from Formik?</div>
              <h2>Swap one import. <br /><span className="accent">Keep shipping.</span></h2>
              <p>
                <code style={{ background: "rgba(255,255,255,0.08)", color: "#a5d6ff", padding: "1px 6px", borderRadius: 3 }}>@fillament/formik-compat</code>{" "}
                implements <code style={{ background: "rgba(255,255,255,0.08)", color: "#a5d6ff", padding: "1px 6px", borderRadius: 3 }}>{`<Formik>`}</code>,{" "}
                <code style={{ background: "rgba(255,255,255,0.08)", color: "#a5d6ff", padding: "1px 6px", borderRadius: 3 }}>useFormik</code>, and the full helper bag.
                Auto-detects Yup and Zod schemas. Migrate one form at a time, on your schedule.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn btn-primary" href={STORYBOOK_URL} target="_blank" rel="noreferrer">
                  See migration demo →
                </a>
                <a className="btn btn-ghost" href={GITHUB_URL}>
                  Read the docs
                </a>
              </div>
            </div>
            <pre className="diff-code">
{`  // package.json — only this line changes
- "formik": "^2.4.0",
+ "@fillament/formik-compat": "^0.1.0"

  // your code
- import { Formik, useFormik } from "formik";
+ import { Formik, useFormik } from "@fillament/formik-compat";
`.split("\n").map((line, i) => {
  if (line.startsWith("-")) return <span key={i} className="diff-rm">{line}{"\n"}</span>;
  if (line.startsWith("+")) return <span key={i} className="diff-add">{line}{"\n"}</span>;
  if (line.startsWith("  //")) return <span key={i} className="diff-comment">{line}{"\n"}</span>;
  return <span key={i}>{line}{"\n"}</span>;
})}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Packages ------------------------------- */

function Packages() {
  const pkgs: Array<{ name: string; desc: string; size: string; status: "ready" | "free" | "planned" }> = [
    { name: "@fillament/core", desc: "Framework-agnostic form engine", size: "~10 KB", status: "ready" },
    { name: "@fillament/react", desc: "useForm, Form, Field, FieldArray, FieldArrayTable, FieldsRenderer", size: "~7 KB", status: "ready" },
    { name: "@fillament/zod", desc: "Zod validation adapter", size: "~1 KB", status: "ready" },
    { name: "@fillament/yup", desc: "Yup validation adapter", size: "~1 KB", status: "ready" },
    { name: "@fillament/json-schema", desc: "JSON Schema adapter (AJV)", size: "~3 KB *", status: "ready" },
    { name: "@fillament/devtools", desc: "Floating in-app inspector panel", size: "~5 KB", status: "free" },
    { name: "@fillament/analytics", desc: "Privacy-safe event protocol + adapters", size: "~1 KB", status: "free" },
    { name: "@fillament/formik-compat", desc: "Drop-in Formik replacement", size: "~4 KB", status: "ready" },
    { name: "@fillament/ai", desc: "In-browser AI form fill via WebLLM", size: "~5 KB †", status: "free" },
    { name: "@fillament/codemod", desc: "npx codemod migrate-formik ./src", size: "—", status: "planned" },
  ];

  return (
    <section id="packages" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Packages</div>
          <h2 className="section-title">Install only what you need.</h2>
          <p className="section-lede">
            Each package ships ESM, CJS, and full TypeScript declarations.
            Validation adapters and analytics targets are optional — your bundle stays lean.
          </p>
        </div>
        <div className="pkg-table">
          <div className="pkg-row head">
            <div>Package</div>
            <div>Description</div>
            <div style={{ textAlign: "right" }}>Size (gzip)</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>
          {pkgs.map((p) => (
            <div className="pkg-row" key={p.name}>
              <div className="pkg-name">{p.name}</div>
              <div className="pkg-desc">{p.desc}</div>
              <div className="pkg-size">{p.size}</div>
              <div className={`pkg-status ${p.status}`}>
                {p.status === "free" ? "Ready · Free" : p.status}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 12, fontFamily: "var(--font-mono)" }}>
          * @fillament/json-schema bundles AJV at runtime ·
          † @fillament/ai requires @mlc-ai/web-llm as an optional peer dep, loaded with dynamic import().
        </p>
      </div>
    </section>
  );
}

/* -------------------------------- Final CTA -------------------------------- */

function FinalCta() {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>Ready to ship better forms?</h2>
        <p>
          Try Fillament in your next migration. DevTools and analytics included,
          free. No SaaS, no signup, no telemetry.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <a className="btn btn-primary" href="#install">
            Get started <span>→</span>
          </a>
          <a className="btn btn-secondary" href={STORYBOOK_URL} target="_blank" rel="noreferrer">
            Explore Storybook
          </a>
          <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GhIcon /> Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Footer --------------------------------- */

function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span className="footer-brand-mark">F</span>
              Fillament
            </div>
            <p className="footer-tagline">
              Type-safe forms for complex React flows. Built for teams that take
              forms seriously.
            </p>
          </div>
          <div>
            <h4>Packages</h4>
            <ul>
              <li><a href="#packages">@fillament/core</a></li>
              <li><a href="#packages">@fillament/react</a></li>
              <li><a href="#validation">Validation adapters</a></li>
              <li><a href="#ai">AI Fill</a></li>
              <li><a href="#packages">DevTools</a></li>
              <li><a href="#packages">Analytics</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><a href={STORYBOOK_URL} target="_blank" rel="noreferrer">Storybook</a></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">License (MIT)</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Fillament · MIT License · v0.1.0</span>
          <span className="footer-status">
            <span className="dot" /> All systems operational · 68/68 tests passing
          </span>
        </div>
      </div>
    </footer>
  );
}

/* -------------- Reusable IDE-style code window -------------- */

function CodeWindow({
  filename,
  code,
  tabs = [],
  active,
}: {
  filename: string;
  code: string;
  tabs?: string[];
  active?: string;
}) {
  return (
    <div className="code">
      <div className="code-chrome">
        <div className="code-dots">
          <span /><span /><span />
        </div>
        <div className="code-tabs">
          {tabs.length > 0 ? (
            tabs.map((t) => (
              <span key={t} className={"code-tab " + (t === (active ?? filename) ? "active" : "")}>{t}</span>
            ))
          ) : (
            <span className="code-tab active">{filename}</span>
          )}
        </div>
      </div>
      <pre>
        <Highlight code={code} />
      </pre>
    </div>
  );
}

/* -------------------- Live demo card (used elsewhere) -------------------- */

export function LiveDemo() {
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const form = useForm<Values>({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", firstName: "", newsletter: true },
  });
  return (
    <div className="demo-card">
      <div className="demo-card-head">
        <span className="status-dot" />
        Live preview · Zod + Fillament
      </div>
      <div className="demo-card-body">
        {submitted ? (
          <>
            <div className="demo-success">✓ Submitted — see the payload in your console.</div>
            <button
              className="submit"
              style={{ marginTop: 12 }}
              onClick={() => {
                form.reset();
                setSubmitted(null);
              }}
            >
              Reset
            </button>
          </>
        ) : (
          <Form
            form={form}
            onSubmit={async (values) => {
              // eslint-disable-next-line no-console
              console.log("submitted", values);
              setSubmitted(values);
            }}
          >
            <Field name="email" label="Email" type="email" required placeholder="you@company.com" />
            <Field name="firstName" label="First name" required placeholder="Ana" />
            <Field name="newsletter" label="Subscribe to product updates" type="checkbox" />
            <button type="submit" className="submit">Save</button>
          </Form>
        )}
      </div>
    </div>
  );
}

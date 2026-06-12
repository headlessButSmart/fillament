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

const VALIDATION_SAMPLES: Record<string, { filename: string; code: string }> = {
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

const WEBMCP_CODE = `import { webmcpPlugin } from "@fillament/webmcp";
import { createMcpBRegistrar } from "@fillament/webmcp/mcp-b";

// Works in today's browsers via the MCP-B extension:
const registrar = await createMcpBRegistrar({ name: "my-shop" });

const form = useForm({
  schema: zodAdapter(CheckoutSchema),
  plugins: [
    webmcpPlugin({
      name: "checkout",
      description: "Checkout form for the user's current cart.",
      registrar,
      // expose: { submit: true },  // off by default
      // confirmSubmit: askTheUser, // human-in-the-loop gate
    }),
  ],
});`;

const BLUEPRINTS_CODE = `import { loginBlueprint, signupBlueprint } from "@fillament/blueprints/auth";
import { addressBlueprint, orderBlueprint } from "@fillament/blueprints/commerce";
import { npsSurveyBlueprint } from "@fillament/blueprints/survey";

const login = loginBlueprint({ rememberMe: true, forgotPassword: true });

const address = addressBlueprint({
  includePhone: true,
  labels: { fullName: "Recipient name" },
});`;

const TEST_DATA_CODE = `import { fillFormWithTestData } from "@fillament/test-data";
import { enableTestDataDevtools } from "@fillament/test-data/devtools";

// In tests & stories — schema-derived, deterministic:
fillFormWithTestData(form, {
  seed: 42,
  overrides: { email: "qa@test.dev" },
});

// Or one click in the DevTools panel (dev builds):
if (import.meta.env.DEV) enableTestDataDevtools();`;

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

const I18N_CODE = `import { createI18n } from "@fillament/i18n";

const i18n = createI18n({
  locale: "pt",
  fallbackLocale: "en",
  messages: {
    en: { "user.email.label": "Email" },
    pt: { "user.email.label": "Email", "user.email.required": "O email é obrigatório" },
  },
});

<Field label={i18n.t({ key: "user.email.label", fallback: "Email" })} />`;

const ANALYTICS_CODE = `import { createAnalyticsPlugin, posthogAnalyticsAdapter } from "@fillament/analytics";

const analytics = createAnalyticsPlugin({
  adapter: posthogAnalyticsAdapter(posthog),
  redact: ["salary"], // on top of password, email, ssn, cvv, iban, dob
});

useEffect(() => analytics.attach(form), [form]);

// 14 event types: form_started, field_changed, field_error,
// form_abandoned, step_completed, server_validation_failed…
// Field values never leave the form. Ever.`;

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <WhyFillament />
        <ValidationSection />
        <AISection />
        <RapidSection />
        <PersistenceSection />
        <ConditionalSection />
        <ArrayTableSection />
        <JsonFieldsSection />
        <I18nAnalyticsSection />
        <DevFriendlySection />
        <UseCases />
        <Comparison />
        <MigrationBanner />
        <Packages />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

/* ---------------------------------- Nav --------------------------------- */

function Nav() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="container nav-inner">
        <a href="#" className="nav-brand">
          <span className="nav-brand-mark">F</span>
          Fillament
          <span className="nav-version">v0.1</span>
        </a>
        <div className="nav-links">
          <a href="#validation">Validation</a>
          <a href="#ai">AI</a>
          <a href="#rapid">Rapid Dev</a>
          <a href="#persistence">Persistence</a>
          <a href="#rich">Rich Features</a>
          <a href="#dev-friendly">Dev Friendly</a>
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
            <span>Open source · MIT · everything free</span>
          </div>
          <h1>
            The React form library<br />
            for teams that <span className="accent">ship complex flows.</span>
          </h1>
          <p className="hero-lede">
            Type-safe field paths, granular re-renders, schema validation with
            Zod, Yup, or JSON Schema, in-browser AI autofill, and a drop-in
            Formik compatibility layer. Seventeen tree-shakable packages —
            install only what your forms need, or grab{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.92em" }}>@fillament/mega</code>{" "}
            for everything at once.
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
              <span className="num">218<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>/218</span></span>
              <span className="label">Tests passing</span>
            </div>
            <div className="hero-trust-item">
              <span className="num">~14<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>KB</span></span>
              <span className="label">core + react gzipped</span>
            </div>
            <div className="hero-trust-item">
              <span className="num">17<span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>/17</span></span>
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
    { num: "0", suffix: " ms", label: "Re-render unrelated fields — verified at 500 fields", accent: true },
    { num: "5", suffix: " styles", label: "Validation: Zod · Yup · JSON Schema · Custom · Inline" },
    { num: "14", suffix: " event types", label: "Privacy-safe analytics built in" },
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

/* ------------------------- Why Fillament (merged) ------------------------- */

function WhyFillament() {
  const items: Array<{ icon: string; title: string; body: string; pkg: string }> = [
    { icon: "◇", title: "Type-safe field paths", body: "Field names are inferred from your value type. Typos and renames caught at compile time.", pkg: "core" },
    { icon: "⚡", title: "Granular re-renders", body: "Typing in one field re-renders only the components subscribed to that field. Verified at 500 fields.", pkg: "core" },
    { icon: "✓", title: "Any validator", body: "Zod, Yup, JSON Schema, or your own adapter. Compose schema + inline rules on the same form.", pkg: "zod · yup · json-schema" },
    { icon: "✦", title: "AI autofill, in-browser", body: "WebLLM runs the model on the user's device. No keys, no costs, no values leave the browser.", pkg: "ai" },
    { icon: "⌘", title: "Forms as agent tools", body: "Expose forms to in-browser AI agents as MCP tools derived from your schema. Submit stays off unless you enable it.", pkg: "webmcp" },
    { icon: "▤", title: "Form blueprints", body: "Login, signup, contact, surveys, commerce, onboarding — production-ready starters, composable and override-friendly.", pkg: "blueprints" },
    { icon: "🎲", title: "Schema-derived test data", body: "Fill any form with realistic, seeded data — formats, enums, and bounds respected. One click in DevTools.", pkg: "test-data" },
    { icon: "↻", title: "Draft persistence", body: "Auto-save long forms to localStorage, sessionStorage, or memory. Sensitive fields excluded by default.", pkg: "persist" },
    { icon: "⇄", title: "Async fields & remote checks", body: "Async options, dependent dropdowns, remote validation with stale-response protection. No React Query required.", pkg: "remote" },
    { icon: "◐", title: "Conditional fields", body: "visibleWhen with safe expression strings or predicates. Three unmount strategies per field.", pkg: "react" },
    { icon: "⊞", title: "Spreadsheet-style tables", body: "FieldArrayTable: each row is an array item, each column a typed sub-field. Stable per-row keys across reorders.", pkg: "react" },
    { icon: "{ }", title: "JSON-driven forms", body: "Load both field layout and validation from JSON. Perfect for CMS-driven or per-tenant forms.", pkg: "react · json-schema" },
    { icon: "🌍", title: "Internationalization", body: "Localized labels and messages with interpolation, fallback locales, and live locale switching.", pkg: "i18n" },
    { icon: "◈", title: "Privacy-safe analytics", body: "14 event types, never sends values. Auto-redacts password, email, ssn, cvv, iban, dob.", pkg: "analytics" },
    { icon: "◉", title: "In-app DevTools", body: "Floating panel with values, fields, errors, validation timing, render counts, and event streams.", pkg: "devtools" },
    { icon: "⇆", title: "Formik drop-in", body: "Swap one import. <Formik>, useFormik, getFieldProps, ErrorMessage — all there.", pkg: "formik-compat" },
    { icon: "◆", title: "Optional Redux bridge", body: "Already on Redux? Mirror values, errors, or full state into a slice. Redux stays an optional peer.", pkg: "redux" },
    { icon: "🌐", title: "SSR-ready", body: "Next.js (App + Pages), Remix, Vite, plain SPA. No window access during render, no hydration warnings.", pkg: "core · react" },
  ];

  return (
    <section id="why">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Why Fillament</div>
          <h2 className="section-title">Everything is optional. Everything is free.</h2>
          <p className="section-lede">
            Fillament ships as 17 focused, MIT-licensed packages. The core gives you
            type-safe state and granular re-renders; everything else — AI, persistence,
            blueprints, analytics, i18n — is an independent, tree-shakable add-on.
            Install only what each form needs, or add{" "}
            <code>@fillament/mega</code> once and import everything through subpaths —
            your bundle stays lean either way.
          </p>
        </div>
        <div className="features">
          {items.map((f) => (
            <article className="feature" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <code style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 12,
                color: "var(--fg-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                @fillament/{f.pkg}
              </code>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Validation tabs ---------------------------- */

function ValidationSection() {
  const [tab, setTab] = useState<keyof typeof VALIDATION_SAMPLES>("zod");
  const sample = VALIDATION_SAMPLES[tab];

  return (
    <section id="validation" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Validation</div>
          <h2 className="section-title">Pick a validator. Or all of them.</h2>
          <p className="section-lede">
            Adapters for Zod, Yup, and JSON Schema ship in the box. Bring your own
            adapter for server checks or domain rules, or write Formik-style inline
            validation. Mix schema-based and inline rules on the same form — five
            validation styles, one consistent API.
          </p>
        </div>
        <div>
          <div className="tabs-bar" role="tablist">
            {(Object.keys(VALIDATION_SAMPLES) as Array<keyof typeof VALIDATION_SAMPLES>).map((key) => (
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

/* ----------------------------------- AI ----------------------------------- */

function AISection() {
  return (
    <section id="ai" className="ai-section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">AI</div>
          <h2 className="section-title">AI-native forms — for users and for agents.</h2>
          <p className="section-lede">
            Users describe what they want in plain language and a model running{" "}
            <strong>entirely in their browser</strong> via{" "}
            <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noreferrer">WebLLM</a>{" "}
            proposes a reviewable patch. In-browser AI agents can discover your
            forms as MCP tools over WebMCP. Both privacy-first, both opt-in.
          </p>
        </div>
        <div className="split">
          <AIPanelMock />
          <div className="copy">
            <h2 style={{ marginBottom: 18 }}>Autofill with zero servers.</h2>
            <CodeWindow filename="UserForm.tsx" code={AI_CODE} tabs={["UserForm.tsx"]} active="UserForm.tsx" />
            <ul className="copy-list" style={{ marginTop: 24 }}>
              <li><span>Pluggable: pass any <a href="https://github.com/mlc-ai/web-llm#model-list" target="_blank" rel="noreferrer">WebLLM model</a> ID — small phi, mid-size llama, or your own</span></li>
              <li><span>Schema-aware: Zod, JSON Schema, or a plain <code>fields</code> description</span></li>
              <li><span>Privacy guardrails: <code>password</code> / <code>ssn</code> / <code>cvv</code> / <code>iban</code> / <code>dob</code> redacted before the model ever sees them</span></li>
              <li><span>Users preview every proposed change before applying — nothing is written silently</span></li>
              <li><span>Tree-shakable: <code>@mlc-ai/web-llm</code> is an optional peer dep loaded with dynamic <code>import()</code></span></li>
            </ul>
          </div>
        </div>
        <div className="split reverse" style={{ marginTop: 80 }}>
          <div className="copy">
            <h2 style={{ marginBottom: 18 }}>
              Your forms, as <span style={{ color: "var(--accent)" }}>MCP tools</span>.
            </h2>
            <p>
              <code>@fillament/webmcp</code> exposes any form to in-browser AI agents
              as Model Context Protocol tools derived from your validation schema.
              Agents read and fill against your real validation rules — and humans
              stay in control.
            </p>
            <ul className="copy-list">
              <li><span>Tool schemas generated from Zod, Yup, or JSON Schema via adapter introspection</span></li>
              <li><span><code>submit</code> is <strong>off by default</strong> — enable it explicitly, with an optional <code>confirmSubmit</code> human-in-the-loop gate</span></li>
              <li><span>Sensitive values redacted from tool responses</span></li>
              <li><span>Works in today's browsers via the MCP-B extension; neutral registrar API ready for native WebMCP</span></li>
            </ul>
          </div>
          <CodeWindow filename="with-webmcp.tsx" code={WEBMCP_CODE} tabs={["with-webmcp.tsx"]} active="with-webmcp.tsx" />
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

/* ----------------------------- Rapid development ----------------------------- */

function RapidSection() {
  return (
    <section id="rapid" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Rapid development</div>
          <h2 className="section-title">From zero to working form in minutes.</h2>
          <p className="section-lede">
            Start from production-ready blueprints instead of a blank file, and fill
            any form with realistic, schema-derived test data while you build. Less
            boilerplate on day one, faster QA every day after.
          </p>
        </div>
        <div className="split">
          <div className="copy">
            <h2 style={{ marginBottom: 18 }}>
              Blueprints: <span style={{ color: "var(--accent)" }}>starter forms</span> that hold up.
            </h2>
            <ul className="copy-list">
              <li><span>Five catalogs: auth, contact, surveys, commerce, onboarding</span></li>
              <li><span>Composable and override-friendly — rename labels, add fields, drop what you don't need</span></li>
              <li><span>Validation included, wired to the same adapters as the rest of your app</span></li>
              <li><span>Commerce blueprints intentionally omit raw card fields — pair with your PSP's elements</span></li>
            </ul>
          </div>
          <CodeWindow filename="with-blueprints.tsx" code={BLUEPRINTS_CODE} tabs={["with-blueprints.tsx"]} active="with-blueprints.tsx" />
        </div>
        <div className="split reverse" style={{ marginTop: 80 }}>
          <div className="copy">
            <h2 style={{ marginBottom: 18 }}>
              Test data, <span style={{ color: "var(--accent)" }}>derived from your schema</span>.
            </h2>
            <ul className="copy-list">
              <li><span>Deterministic: same seed, same data — stable fixtures in tests and stories</span></li>
              <li><span>Respects formats, enums, and min/max bounds; smart name heuristics for the rest</span></li>
              <li><span>One-click “Fill with test data” button in the DevTools panel (dev builds only)</span></li>
              <li><span>Works with any adapter that supports introspection — Zod, Yup, JSON Schema</span></li>
            </ul>
          </div>
          <CodeWindow filename="with-test-data.tsx" code={TEST_DATA_CODE} tabs={["with-test-data.tsx"]} active="with-test-data.tsx" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Persistence & APIs --------------------------- */

const PERSISTENCE_SAMPLES: Record<string, { filename: string; code: string }> = {
  persist: {
    filename: "with-persist.tsx",
    code: `import { useForm } from "@fillament/react";
import { createStoragePersistPlugin } from "@fillament/persist";

const form = useForm({
  schema,
  defaultValues,
  plugins: [
    createStoragePersistPlugin({
      key: "checkout",
      version: 1,
      debounceMs: 500,
      restoreOnMount: true,
      clearOnSubmit: true,
    }),
  ],
});`,
  },
  remote: {
    filename: "with-remote.tsx",
    code: `import { remoteOptions, remoteValidation } from "@fillament/remote";

const cityOptions = remoteOptions({
  key: (ctx) => ["cities", ctx.values.country],
  enabled: (ctx) => Boolean(ctx.values.country),
  fetcher: async ({ values, signal }) =>
    (await fetch(\`/api/cities?c=\${values.country}\`, { signal })).json(),
});

const validateEmail = remoteValidation({
  debounceMs: 400,
  fetcher: async ({ value, signal }) => {
    const r = await fetch(\`/api/email-check?email=\${value}\`, { signal });
    return (await r.json()).available ? undefined : "Email taken";
  },
});`,
  },
  redux: {
    filename: "with-redux.tsx",
    code: `import { createReduxBridge } from "@fillament/redux";

const form = useForm({
  schema,
  plugins: [
    createReduxBridge({
      store,
      slice: "checkoutForm",
      mode: "values-only",
      debounceMs: 100,
    }),
  ],
});`,
  },
};

const PERSISTENCE_CARDS: Array<{
  name: keyof typeof PERSISTENCE_SAMPLES;
  icon: string;
  title: string;
  body: string;
}> = [
  {
    name: "persist",
    icon: "↻",
    title: "Persist — draft restore",
    body: "Auto-save long forms to localStorage, sessionStorage, or memory. Sensitive fields (password, token, ssn, cvv) excluded by default. Version migrations built in.",
  },
  {
    name: "remote",
    icon: "⇄",
    title: "Remote — async fields",
    body: "Async options, dependent dropdowns, remote validation, remote default values. Stale-response protection. No React Query or SWR required.",
  },
  {
    name: "redux",
    icon: "◆",
    title: "Redux — optional bridge",
    body: "Already on Redux? Mirror values, errors, or full state into a slice. One-way after hydration, debounced. Redux stays an optional peer.",
  },
];

function PersistenceSection() {
  const [tab, setTab] = useState<keyof typeof PERSISTENCE_SAMPLES>("persist");
  const sample = PERSISTENCE_SAMPLES[tab];

  return (
    <section id="persistence">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Persistence &amp; APIs</div>
          <h2 className="section-title">Forms that survive reloads and talk to your backend.</h2>
          <p className="section-lede">
            Draft auto-save with restore, async options and server-side validation
            with stale-response protection, and an optional Redux bridge for teams
            already invested in a store. Each one a plugin, each one tree-shakable.
          </p>
        </div>

        <div className="features" style={{ marginBottom: 32 }}>
          {PERSISTENCE_CARDS.map((c) => (
            <article
              className="feature"
              key={c.name}
              onClick={() => setTab(c.name)}
              style={{ cursor: "pointer", outline: tab === c.name ? "2px solid var(--accent)" : undefined }}
            >
              <div className="feature-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <code style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 12,
                color: "var(--fg-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                @fillament/{c.name}
              </code>
            </article>
          ))}
        </div>

        <div className="tabs-bar" role="tablist">
          {(Object.keys(PERSISTENCE_SAMPLES) as Array<keyof typeof PERSISTENCE_SAMPLES>).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {key[0]!.toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
        <CodeWindow
          filename={sample!.filename}
          code={sample!.code}
          tabs={[sample!.filename]}
          active={sample!.filename}
        />
      </div>
    </section>
  );
}

/* ------------------------- Rich features: conditional ------------------------- */

function ConditionalSection() {
  return (
    <section id="rich" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Rich features</div>
          <h2 className="section-title">The hard parts of real-world forms, built in.</h2>
          <p className="section-lede">
            Conditional flows, spreadsheet-style editing, JSON-driven rendering,
            localized messages, and privacy-safe analytics — the capabilities that
            usually mean a second library (or three) are first-class here.
          </p>
        </div>
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

/* ------------------------------- Array table ------------------------------- */

function ArrayTableSection() {
  return (
    <section>
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

/* --------------------------- I18n & analytics --------------------------- */

function I18nAnalyticsSection() {
  return (
    <section>
      <div className="container">
        <div className="split">
          <div className="copy">
            <div className="eyebrow">Internationalization</div>
            <h2>Every label, every message, <span style={{ color: "var(--accent)" }}>localized</span>.</h2>
            <ul className="copy-list">
              <li><span>Plain strings or <code>{`{ key, fallback }`}</code> messages with interpolation</span></li>
              <li><span>Fallback locales and live locale switching</span></li>
              <li><span>Custom resolvers plug into intl, i18next, or lingui</span></li>
            </ul>
          </div>
          <CodeWindow filename="with-i18n.tsx" code={I18N_CODE} tabs={["with-i18n.tsx"]} active="with-i18n.tsx" />
        </div>
        <div className="split reverse" style={{ marginTop: 80 }}>
          <div className="copy">
            <div className="eyebrow">Analytics</div>
            <h2>Funnel insight, <span style={{ color: "var(--accent)" }}>zero leaked values</span>.</h2>
            <ul className="copy-list">
              <li><span>14 event types — starts, abandons, field errors, step completion, server validation timing</span></li>
              <li><span>Field values are never emitted; sensitive field names auto-redacted and hashed</span></li>
              <li><span>Adapters for Segment, PostHog, console, or your own sink — none required as deps</span></li>
            </ul>
          </div>
          <CodeWindow filename="with-analytics.tsx" code={ANALYTICS_CODE} tabs={["with-analytics.tsx"]} active="with-analytics.tsx" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Dev friendly ------------------------------ */

function DevFriendlySection() {
  const items: Array<{ icon: string; title: string; body: string }> = [
    { icon: "◉", title: "In-app DevTools", body: "One line: <FillamentDevTools form={form} />. Values, errors, validation timing, render counts, event streams, and a test-data fill button — in a floating panel." },
    { icon: "🌳", title: "Tree-shakable by design", body: "16 packages, ESM + CJS + full TypeScript declarations, sideEffect-free modules. Heavy deps (WebLLM, MCP SDK) are optional peers behind dynamic import()." },
    { icon: "⚡", title: "High performance", body: "Subscription-based state: typing in one field re-renders only that field's subscribers. Benchmarked in Storybook at 500 fields." },
    { icon: "🔷", title: "100% TypeScript, strict", body: "Field paths inferred from your value types. Generics flow from schema to <Field> to submit handler — no any, no casts." },
    { icon: "🧪", title: "Tested & deterministic", body: "207 tests across all 16 packages, all passing. Schema-derived test data keeps fixtures deterministic with seeds." },
    { icon: "🔓", title: "No lock-in", body: "MIT license, no SaaS, no signup, no telemetry. A framework-agnostic core and a Formik-compatible escape hatch in both directions." },
  ];
  return (
    <section id="dev-friendly" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Dev friendly</div>
          <h2 className="section-title">Built by form nerds, for your whole team.</h2>
          <p className="section-lede">
            Free DevTools, strict types, lean tree-shakable bundles, and performance
            that holds up at hundreds of fields — the developer experience is the product.
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

/* ------------------------------- Use cases ------------------------------- */

function UseCases() {
  const items: Array<{ icon: string; title: string; body: string; tags: string[] }> = [
    {
      icon: "▣",
      title: "Onboarding & signup",
      body: "Multi-step wizards with hidden-step preservation, server-validated usernames, AI autofill from a pasted bio, and progressive disclosure.",
      tags: ["wizard", "remote validation", "AI autofill"],
    },
    {
      icon: "◭",
      title: "Checkout & billing",
      body: "Address blueprints, country-conditional zip rules, draft restore after an accidental reload, and coupon validation against your API.",
      tags: ["blueprints", "conditional", "persist"],
    },
    {
      icon: "▦",
      title: "Admin panels & internal tools",
      body: "Dynamic field lists from a schema, role-based read-only, spreadsheet-style bulk editing, and DevTools for debugging in place.",
      tags: ["JSON-driven", "field arrays", "DevTools"],
    },
    {
      icon: "✚",
      title: "Healthcare & insurance intake",
      body: "Long multi-step intake forms with draft persistence, conditional sections per coverage type, and analytics that never leak patient data.",
      tags: ["persist", "conditional", "redaction"],
    },
    {
      icon: "◍",
      title: "Fintech KYC & compliance",
      body: "Server-side identity checks with stale-response protection, document-dependent conditional fields, and audit-friendly funnel events.",
      tags: ["remote validation", "conditional", "analytics"],
    },
    {
      icon: "◔",
      title: "Surveys & feedback",
      body: "NPS and survey blueprints, localized labels for every market, abandon-point analytics, and JSON-driven question lists from your CMS.",
      tags: ["blueprints", "i18n", "analytics"],
    },
    {
      icon: "⬡",
      title: "Multi-tenant SaaS forms",
      body: "Per-tenant field layouts and validation loaded from JSON at runtime, localized per tenant, with one shared rendering pipeline.",
      tags: ["JSON-driven", "json-schema", "i18n"],
    },
    {
      icon: "⌘",
      title: "Agent-ready commerce",
      body: "Expose checkout and quote forms as WebMCP tools so AI agents can fill them against real validation — submit gated behind human confirmation.",
      tags: ["webmcp", "AI agents", "human-in-the-loop"],
    },
    {
      icon: "🧪",
      title: "QA & demo environments",
      body: "Seeded, schema-derived test data for stable E2E fixtures, one-click form fills during manual QA, and realistic demo data for sales.",
      tags: ["test data", "deterministic", "DevTools"],
    },
  ];
  return (
    <section id="use-cases">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Use cases</div>
          <h2 className="section-title">Where teams reach for Fillament.</h2>
          <p className="section-lede">
            Anywhere a form outgrows a login screen — regulated industries, complex
            checkouts, internal tools, and the new wave of agent-driven interfaces.
          </p>
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
              <GroupRow label="Core" />
              <Row label="Type-safe field paths" v={["yes", "partial", "yes"]} />
              <Row label="Renders only the changed field" v={["yes", "no", "yes"]} />
              <Row label="Field array reorder preserves state" v={["yes", "partial", "yes"]} />
              <GroupRow label="Validation" />
              <Row label="Zod validation" v={["yes", "partial", "yes"]} />
              <Row label="Yup validation" v={["yes", "yes", "yes"]} />
              <Row label="JSON Schema validation" v={["yes", "partial", "yes"]} />
              <GroupRow label="AI" />
              <Row label="In-browser AI form fill" v={["yes", "no", "no"]} />
              <Row label="Forms as AI-agent tools (WebMCP / MCP)" v={["yes", "no", "no"]} />
              <GroupRow label="Rapid development" />
              <Row label="Starter form blueprints (login, signup, NPS, order…)" v={["yes", "no", "no"]} />
              <Row label="Schema-derived test data + DevTools fill button" v={["yes", "no", "no"]} />
              <GroupRow label="Persistence & APIs" />
              <Row label="Draft persistence with sensitive-field guard" v={["yes", "no", "no"]} />
              <Row label="Async options / dependent selects (no React Query)" v={["yes", "no", "partial"]} />
              <Row label="Remote validation with stale-response protection" v={["yes", "partial", "yes"]} />
              <Row label="Optional Redux bridge (peer dep, opt-in)" v={["yes", "no", "no"]} />
              <GroupRow label="Rich features" />
              <Row label="First-class conditional fields" v={["yes", "no", "partial"]} />
              <Row label="Spreadsheet-style array tables" v={["yes", "no", "no"]} />
              <Row label="JSON-driven field rendering" v={["yes", "no", "partial"]} />
              <Row label="Localized labels & messages (i18n adapter)" v={["yes", "no", "no"]} />
              <Row label="Privacy-safe analytics" v={["yes", "no", "no"]} />
              <GroupRow label="Dev friendly" />
              <Row label="Free in-app DevTools" v={["yes", "no", "yes"]} />
              <Row label="Formik drop-in compatibility" v={["yes", "—", "no"]} />
            </tbody>
          </table>
        </div>
        <div className="compare-legend">
          <span><span className="yes">●</span> Supported</span>
          <span><span className="partial">●</span> Partial</span>
          <span><span className="no">●</span> Not supported</span>
        </div>
      </div>
    </section>
  );
}

function GroupRow({ label }: { label: string }) {
  return (
    <tr className="compare-divider">
      <td colSpan={4}>{label}</td>
    </tr>
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

type Pkg = { name: string; desc: string; size: string };

const PACKAGE_GROUPS: Array<{ group: string; pkgs: Pkg[] }> = [
  {
    group: "Everything in one",
    pkgs: [
      { name: "@fillament/mega", desc: "Batteries included — every package plus Zod, Yup, AJV, WebLLM & the MCP bridge bundled, behind tree-shakable subpaths. Just add React.", size: "re-exports" },
    ],
  },
  {
    group: "Core",
    pkgs: [
      { name: "@fillament/core", desc: "Framework-agnostic form engine", size: "~9 KB" },
      { name: "@fillament/react", desc: "useForm, Form, Field, FieldArray, FieldArrayTable, FieldsRenderer", size: "~6 KB" },
    ],
  },
  {
    group: "Validation",
    pkgs: [
      { name: "@fillament/zod", desc: "Zod validation adapter with schema introspection", size: "~2 KB" },
      { name: "@fillament/yup", desc: "Yup validation adapter with schema introspection", size: "~1.5 KB" },
      { name: "@fillament/json-schema", desc: "JSON Schema adapter (AJV) *", size: "~1 KB" },
    ],
  },
  {
    group: "AI",
    pkgs: [
      { name: "@fillament/ai", desc: "In-browser AI form fill via WebLLM †", size: "~9 KB" },
      { name: "@fillament/webmcp", desc: "Forms as WebMCP tools for in-browser AI agents — submit off by default ‡", size: "~3 KB" },
    ],
  },
  {
    group: "Rapid development",
    pkgs: [
      { name: "@fillament/blueprints", desc: "Starter forms — login, signup, contact, surveys, commerce, onboarding", size: "~4.5 KB" },
      { name: "@fillament/test-data", desc: "Schema-derived deterministic test data + DevTools fill button", size: "~3.5 KB" },
    ],
  },
  {
    group: "Persistence & APIs",
    pkgs: [
      { name: "@fillament/persist", desc: "Draft auto-save & restore (localStorage / session / memory)", size: "~2.5 KB" },
      { name: "@fillament/remote", desc: "Async options, dependent lookups, remote validation", size: "~2.5 KB" },
      { name: "@fillament/redux", desc: "Optional Redux bridge — for teams already on Redux", size: "~1 KB" },
    ],
  },
  {
    group: "Rich features",
    pkgs: [
      { name: "@fillament/i18n", desc: "Localized labels, fallbacks, interpolation", size: "~1 KB" },
      { name: "@fillament/analytics", desc: "Privacy-safe event protocol + adapters (14 event types)", size: "~1 KB" },
    ],
  },
  {
    group: "Dev friendly",
    pkgs: [
      { name: "@fillament/devtools", desc: "Floating in-app inspector panel with actions", size: "~4 KB" },
      { name: "@fillament/formik-compat", desc: "Drop-in Formik replacement", size: "~3.5 KB" },
    ],
  },
];

function Packages() {
  return (
    <section id="packages" className="alt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Packages</div>
          <h2 className="section-title">17 packages. Install only what you need.</h2>
          <p className="section-lede">
            Every package is free and MIT-licensed — no paid tiers, no feature gates.
            Each ships ESM, CJS, and full TypeScript declarations, grouped here the
            same way the page is: core first, then the capability you're after. In a
            hurry? <code>pnpm add @fillament/mega</code> brings the whole toolkit in
            one dependency.
          </p>
        </div>
        <div className="pkg-table">
          <div className="pkg-row head">
            <div>Package</div>
            <div>Description</div>
            <div style={{ textAlign: "right" }}>Size (gzip)</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>
          {PACKAGE_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="pkg-row group">
                <div style={{ gridColumn: "1 / -1" }}>{g.group}</div>
              </div>
              {g.pkgs.map((p) => (
                <div className="pkg-row" key={p.name}>
                  <div className="pkg-name">{p.name}</div>
                  <div className="pkg-desc">{p.desc}</div>
                  <div className="pkg-size">{p.size}</div>
                  <div className="pkg-status ready">ready</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 12, fontFamily: "var(--font-mono)" }}>
          * @fillament/json-schema depends on ajv + ajv-formats at runtime ·
          † @fillament/ai requires @mlc-ai/web-llm as an optional peer dep, loaded with dynamic import() ·
          ‡ @fillament/webmcp's /mcp-b entry needs @modelcontextprotocol/sdk + @mcp-b/transports as optional peers.
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------- FAQ ---------------------------------- */

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Is Fillament free?",
    a: "Yes — all 17 packages are free and MIT-licensed, including DevTools, analytics, AI autofill, and WebMCP support. There is no paid tier, no SaaS, no signup, and no telemetry.",
  },
  {
    q: "Is there a single package that includes everything?",
    a: "Yes. @fillament/mega is the batteries-included install: every Fillament package plus Zod, Yup, AJV, the WebLLM engine, and the MCP bridge ship as bundled dependencies, re-exported behind tree-shakable subpaths like @fillament/mega/zod and /persist. The root entry combines the core engine with the React bindings, and bundlers only ship the entries you actually import — React itself stays a peer (auto-installed by npm and pnpm) so your app keeps a single React instance.",
  },
  {
    q: "How is Fillament different from Formik or React Hook Form?",
    a: "Fillament combines type-safe field paths and granular re-renders with capabilities the others leave to userland: first-class conditional fields, spreadsheet-style array tables, JSON-driven rendering, in-browser AI autofill, WebMCP agent tools, draft persistence, blueprints, and privacy-safe analytics — each as an optional, tree-shakable package.",
  },
  {
    q: "Does AI autofill send my users' data to a server?",
    a: "No. @fillament/ai runs the language model entirely in the user's browser via WebLLM. There are no API keys and no network calls with form data, and sensitive fields like password, ssn, cvv, iban, and dob are redacted before the model sees anything.",
  },
  {
    q: "Can AI agents submit forms through WebMCP?",
    a: "Only if you let them. @fillament/webmcp exposes read and fill tools derived from your validation schema; the submit tool is off by default and can be gated behind a human-in-the-loop confirmation callback when you enable it.",
  },
  {
    q: "Can I migrate from Formik incrementally?",
    a: "Yes. @fillament/formik-compat is a drop-in replacement that implements <Formik>, useFormik, and the helper API, and auto-detects Yup and Zod schemas — so you can migrate one form at a time without a big-bang rewrite.",
  },
  {
    q: "Does Fillament work with Next.js and server-side rendering?",
    a: "Yes. Fillament supports Next.js (both App and Pages routers), Remix, Vite, and plain SPAs. It performs no window access during render and produces no hydration warnings.",
  },
];

function Faq() {
  return (
    <section id="faq">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Frequently asked questions.</h2>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
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
          Try Fillament in your next migration. All 17 packages included,
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
            <h4>Explore</h4>
            <ul>
              <li><a href="#validation">Validation</a></li>
              <li><a href="#ai">AI &amp; WebMCP</a></li>
              <li><a href="#rapid">Rapid development</a></li>
              <li><a href="#persistence">Persistence &amp; APIs</a></li>
              <li><a href="#rich">Rich features</a></li>
              <li><a href="#dev-friendly">Dev friendly</a></li>
              <li><a href="#packages">All packages</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><a href={STORYBOOK_URL} target="_blank" rel="noreferrer">Storybook</a></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="#compare">Comparison</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">License (MIT)</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Fillament · MIT License · v0.1.0</span>
          <span className="footer-status">
            <span className="dot" /> All systems operational · 218/218 tests passing
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

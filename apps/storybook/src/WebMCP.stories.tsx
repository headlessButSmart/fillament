import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import {
  webmcpPlugin,
  isModelContextAvailable,
  type ToolRegistrar,
  type WebMCPTool,
} from "@fillament/webmcp";

const Schema = z.object({
  email: z.string().email("Enter a valid email").describe("Work email"),
  fullName: z.string().min(1, "Required"),
  address: z.object({
    city: z.string().min(1, "Required"),
    country: z.enum(["US", "GB", "DE", "TR"]),
  }),
  quantity: z.number().int().min(1).max(10),
  password: z.string().min(8, "Min 8 chars"),
});
type Values = z.infer<typeof Schema>;

const DEFAULTS: Partial<Values> = {
  email: "",
  fullName: "",
  address: { city: "", country: "US" },
  quantity: 1,
  password: "",
};

type LogEntry = {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  isError: boolean;
};

/**
 * In-memory ToolRegistrar standing in for the browser agent runtime, so the
 * full read → fill → fix → submit loop is clickable inside Storybook. In a
 * real app you would omit `registrar` (W3C navigator.modelContext) or pass
 * `createMcpBRegistrar()` from "@fillament/webmcp/mcp-b".
 */
function useMockRegistrar() {
  // Tools live in a ref because registration fires inside useForm's render-time
  // createForm call — the re-render is deferred to a microtask.
  const toolsRef = useRef<WebMCPTool[]>([]);
  const [, force] = useState(0);
  const registrar = useMemo<ToolRegistrar>(
    () => ({
      register(tool) {
        toolsRef.current = [...toolsRef.current, tool];
        queueMicrotask(() => force((c) => c + 1));
        return () => {
          toolsRef.current = toolsRef.current.filter((t) => t !== tool);
          queueMicrotask(() => force((c) => c + 1));
        };
      },
    }),
    []
  );
  return { registrar, tools: toolsRef.current };
}

function AgentConsole({
  tools,
  log,
  onCall,
}: {
  tools: WebMCPTool[];
  log: LogEntry[];
  onCall: (tool: WebMCPTool, args: Record<string, unknown>) => void;
}) {
  const findTool = (suffix: string) => tools.find((t) => t.name.endsWith(suffix));
  const getState = findTool("_get_state");
  const fill = findTool("_fill");
  const submit = findTool("_submit");

  return (
    <div>
      <h3>Simulated agent</h3>
      <p className="subtitle" style={{ marginTop: 0 }}>
        Registered tools: {tools.length ? tools.map((t) => <code key={t.name} style={{ marginRight: 6 }}>{t.name}</code>) : "(none)"}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {getState && (
          <button type="button" onClick={() => onCall(getState, {})}>
            1 · Read state
          </button>
        )}
        {fill && (
          <button
            type="button"
            onClick={() =>
              onCall(fill, {
                email: "not-an-email",
                fullName: "Grace Hopper",
                "address.city": "London",
                "address.country": "GB",
                quantity: 3,
              })
            }
          >
            2 · Fill (bad email — see errors)
          </button>
        )}
        {fill && (
          <button
            type="button"
            onClick={() => onCall(fill, { email: "grace@navy.mil", password: "correct-horse" })}
          >
            3 · Fix from errors
          </button>
        )}
        {submit && (
          <button type="button" onClick={() => onCall(submit, {})}>
            4 · Submit
          </button>
        )}
      </div>
      <div className="fl-output" style={{ maxHeight: 360, overflow: "auto" }}>
        <strong>Tool call log (newest first):</strong>
        {log.length === 0 ? (
          <p style={{ margin: "8px 0 0" }}>(no calls yet — drive the agent with the buttons)</p>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ marginTop: 10, borderTop: "1px dashed #ccc", paddingTop: 8 }}>
              <div>
                <code>{entry.tool}</code>{" "}
                {entry.isError ? <strong style={{ color: "#a40e26" }}>error</strong> : "ok"}
                {" · args: "}
                <code>{JSON.stringify(entry.args)}</code>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", fontSize: 12 }}>{entry.result}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AgentLoopDemo({ exposeSubmit }: { exposeSubmit: boolean }) {
  const { registrar, tools } = useMockRegistrar();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [submitted, setSubmitted] = useState<string>("(not submitted)");

  const form = useForm<Values>({
    id: "checkout",
    schema: zodAdapter(Schema),
    defaultValues: DEFAULTS,
    onSubmit: async (values) => setSubmitted(JSON.stringify(values, null, 2)),
    plugins: [
      webmcpPlugin<Values>({
        name: "checkout",
        description: "Checkout form for the user's current cart.",
        registrar,
        expose: exposeSubmit ? { submit: true } : undefined,
        confirmSubmit: exposeSubmit
          ? () => window.confirm("The assistant wants to submit this form. Allow?")
          : undefined,
      }),
    ],
  });

  const call = async (tool: WebMCPTool, args: Record<string, unknown>) => {
    const result = await tool.execute(args);
    setLog((prev) => [
      { tool: tool.name, args, result: result.content[0]?.text ?? "", isError: !!result.isError },
      ...prev,
    ]);
  };

  return (
    <div className="fl-demo">
      <h2>WebMCP · {exposeSubmit ? "with submit enabled" : "read + fill (default)"}</h2>
      <p className="subtitle">
        The form registers MCP tools whose schemas come from the Zod schema. The right panel plays
        the agent: walk buttons 1→4 and watch values land in the form, validation errors come back
        as tool results, and <code>password</code> show up as <code>[redacted]</code> in reads.
        {exposeSubmit
          ? " Submit is exposed here, gated by a confirm dialog (human in the loop)."
          : " There is no submit tool — that's the default; a human presses the button."}
        {" "}W3C <code>navigator.modelContext</code> available in this browser:{" "}
        <code>{String(isModelContextAvailable())}</code>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h3>The form</h3>
          <Form form={form} onSubmit={async (values) => setSubmitted(JSON.stringify(values, null, 2))}>
            <Field name="email" label="Email" type="email" required />
            <Field name="fullName" label="Full name" required />
            <Field name="address.city" label="City" required />
            <Field name="address.country" label="Country" options={[
              { label: "United States", value: "US" },
              { label: "United Kingdom", value: "GB" },
              { label: "Germany", value: "DE" },
              { label: "Türkiye", value: "TR" },
            ]} />
            <Field name="quantity" label="Quantity (1–10)" type="number" required />
            <Field name="password" label="Password (redacted from agent reads)" type="password" required />
            <button type="submit">Place order (human)</button>
          </Form>
          <div className="fl-output" style={{ marginTop: 16 }}>
            <strong>onSubmit received:</strong>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{submitted}</pre>
          </div>
        </div>
        <AgentConsole tools={tools} log={log} onCall={call} />
      </div>
    </div>
  );
}

/* ----------------------------- Tool schema story ---------------------------- */

function ToolSchemaDemo() {
  const { registrar, tools } = useMockRegistrar();

  useForm<Values>({
    id: "checkout",
    schema: zodAdapter(Schema),
    defaultValues: DEFAULTS,
    plugins: [webmcpPlugin<Values>({ name: "checkout", registrar })],
  });

  return (
    <div className="fl-demo">
      <h2>WebMCP · What the agent receives</h2>
      <p className="subtitle">
        Each tool ships a description and a JSON Schema for its arguments. <code>checkout_fill</code>'s
        schema is the Zod schema converted by <code>introspect()</code> and relaxed for partial
        updates (no <code>required</code> — agents send only the fields they change). Note the
        <code> email</code> format, the country <code>enum</code>, the quantity bounds, and the
        <code> .describe()</code> text — all straight from Zod.
      </p>
      {tools.map((tool) => (
        <div className="fl-output" key={tool.name} style={{ marginBottom: 16 }}>
          <strong><code>{tool.name}</code></strong>
          <p style={{ margin: "4px 0 8px" }}>{tool.description}</p>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>
            {JSON.stringify(tool.inputSchema, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: "Optional Modules/WebMCP",
};
export default meta;

type Story = StoryObj;

export const AgentLoop: Story = {
  name: "Agent loop (read → fill → fix)",
  render: () => <AgentLoopDemo exposeSubmit={false} />,
};
export const WithSubmit: Story = {
  name: "Submit enabled + confirm gate",
  render: () => <AgentLoopDemo exposeSubmit={true} />,
};
export const ToolSchemas: Story = {
  name: "Tool schemas (what agents see)",
  render: () => <ToolSchemaDemo />,
};

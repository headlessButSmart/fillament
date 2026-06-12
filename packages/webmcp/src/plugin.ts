import type { FillamentPlugin, FormApi } from "@fillament/core";
import type { WebMCPOptions } from "./types.js";
import { buildFormTools } from "./tools.js";
import { createModelContextRegistrar } from "./native.js";

/**
 * Register a form's WebMCP tools imperatively. Returns an unregister function.
 * Prefer `webmcpPlugin` when creating the form yourself.
 */
export function registerFormWithWebMCP<TValues>(
  form: FormApi<TValues>,
  options: WebMCPOptions<TValues> = {}
): () => void {
  const registrar = options.registrar ?? createModelContextRegistrar();
  const unregisters = buildFormTools(form, options).map((tool) => registrar.register(tool));
  return () => {
    for (const unregister of unregisters) {
      try {
        unregister();
      } catch {
        // Unregistration must never break form teardown.
      }
    }
  };
}

/**
 * Fillament plugin that exposes the form to in-browser AI agents as WebMCP
 * tools (`<name>_get_state`, `<name>_fill`, and — only when enabled —
 * `<name>_submit`). Tools are registered on form init and unregistered on
 * teardown.
 *
 * @example
 * const form = useForm({
 *   schema: zodAdapter(CheckoutSchema),
 *   plugins: [
 *     webmcpPlugin({
 *       name: "checkout",
 *       description: "Checkout form for the user's current cart.",
 *       expose: { submit: true },
 *       confirmSubmit: (values) => window.confirm("Let the assistant submit?"),
 *     }),
 *   ],
 * });
 */
export function webmcpPlugin<TValues = unknown>(
  options: WebMCPOptions<TValues> = {}
): FillamentPlugin<TValues> {
  return {
    name: "@fillament/webmcp",
    onInit(ctx) {
      return registerFormWithWebMCP(ctx.form, options);
    },
  };
}

import { introspectForm, type FormApi } from "@fillament/core";
import type { WebMCPOptions, WebMCPTool, WebMCPToolResult } from "./types.js";
import { buildRedactPredicate, redactValues } from "./redact.js";
import { flattenPatch, relaxForPartialUpdate, sanitizeToolName } from "./schema.js";

function ok(payload: unknown): WebMCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(payload: unknown): WebMCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: true };
}

function errorSummary(form: FormApi<any>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [path, errors] of Object.entries(form.getState().errors)) {
    if (errors?.length) out[path] = errors.map((e) => e.message);
  }
  return out;
}

/**
 * Build the WebMCP tools for a form. Exposed for advanced use; most apps go
 * through `webmcpPlugin` / `registerFormWithWebMCP` instead.
 */
export function buildFormTools<TValues>(
  form: FormApi<TValues>,
  options: WebMCPOptions<TValues> = {}
): WebMCPTool[] {
  const prefix = sanitizeToolName(options.name ?? form.id);
  const expose = { read: true, fill: true, submit: false, ...options.expose };
  const isSensitive = buildRedactPredicate(options.redact);
  const about = options.description ? ` Form: ${options.description}` : "";

  const tools: WebMCPTool[] = [];

  if (expose.read) {
    tools.push({
      name: `${prefix}_get_state`,
      description:
        `Read the current state of the "${prefix}" form: values, per-field validation errors, ` +
        `and whether it can be submitted. Call this before and after filling.${about}`,
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const state = form.getState();
        return ok({
          values: redactValues(state.values, isSensitive),
          errors: errorSummary(form),
          formErrors: state.formErrors.map((e) => e.message),
          isValid: state.isValid,
          dirty: state.dirty,
          canSubmit: form.canSubmit,
          submitCount: state.submitCount,
        });
      },
    });
  }

  if (expose.fill) {
    tools.push({
      name: `${prefix}_fill`,
      description:
        `Fill fields of the "${prefix}" form. Pass only the fields you want to change; ` +
        `nested fields may be addressed with dot-paths (e.g. "address.city"). ` +
        `Returns the validation result — fix any reported errors and call again.${about}`,
      inputSchema: relaxForPartialUpdate(introspectForm(form)),
      execute: async (args) => {
        const patch = flattenPatch(args ?? {});
        const applied: string[] = [];
        for (const [path, value] of Object.entries(patch)) {
          form.setValue(path, value, { shouldTouch: true });
          applied.push(path);
        }
        const result = await form.validate();
        return ok({
          applied,
          valid: result.valid,
          errors: errorSummary(form),
          formErrors: form.getState().formErrors.map((e) => e.message),
        });
      },
    });
  }

  if (expose.submit) {
    tools.push({
      name: `${prefix}_submit`,
      description:
        `Submit the "${prefix}" form. Validation runs first; if it fails, errors are returned ` +
        `and nothing is submitted. Only call after the user asked for the form to be sent.${about}`,
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        if (options.confirmSubmit) {
          let confirmed = false;
          try {
            confirmed = await options.confirmSubmit(form.getValues());
          } catch {
            confirmed = false;
          }
          if (!confirmed) {
            return fail({ submitted: false, reason: "Submission was not confirmed by the user." });
          }
        }
        const result = await form.validate();
        if (!result.valid) {
          return fail({
            submitted: false,
            reason: "Validation failed.",
            errors: errorSummary(form),
            formErrors: form.getState().formErrors.map((e) => e.message),
          });
        }
        try {
          await form.submit();
        } catch (err) {
          return fail({ submitted: false, reason: String(err) });
        }
        const state = form.getState();
        const stillHasErrors =
          state.formErrors.length > 0 || Object.values(state.errors).some((e) => e?.length);
        return stillHasErrors
          ? fail({
              submitted: false,
              reason: "The submit handler reported errors.",
              errors: errorSummary(form),
              formErrors: state.formErrors.map((e) => e.message),
            })
          : ok({ submitted: true, submitCount: state.submitCount });
      },
    });
  }

  return tools;
}

// Optional DevTools integration. Importing from "@fillament/test-data/devtools"
// requires @fillament/devtools to be installed (it is an optional peer).
import { registerDevtoolsAction } from "@fillament/devtools";
import { fillFormWithTestData, type FillOptions } from "./fill.js";

export type TestDataDevtoolsOptions = FillOptions & {
  // Toolbar button label. Defaults to "🎲 Fill test data".
  label?: string;
};

/**
 * Register a "Fill test data" button in the Fillament DevTools toolbar. The
 * button fills whichever form the panel is currently attached to.
 *
 * Call once at app startup (dev builds only):
 *
 *   if (import.meta.env.DEV) enableTestDataDevtools();
 *
 * Returns an unregister function.
 */
export function enableTestDataDevtools(options: TestDataDevtoolsOptions = {}): () => void {
  const { label, ...fillOptions } = options;
  return registerDevtoolsAction({
    id: "@fillament/test-data",
    label: label ?? "🎲 Fill test data",
    title: "Fill the form with generated data derived from its validation schema",
    run: (form) => {
      fillFormWithTestData(form, fillOptions);
    },
  });
}

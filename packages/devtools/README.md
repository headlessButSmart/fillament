# @fillament/devtools

Free in-app DevTools panel for [Fillament](https://github.com/headlessButSmart/fillament). A floating inspector with tabs for **Overview, Values, Fields, Errors, Validation timing, Render counts, Analytics events, and DevTools events**.

```bash
pnpm add @fillament/devtools
```

```tsx
import { FillamentDevTools } from "@fillament/devtools";

<FillamentDevTools form={form} />
```

Pass a specific form, or omit `form` to discover registered forms in development:

```tsx
<FillamentDevTools />
```

Pair with `registerFormForDevtools(form)` if you want forms to auto-register.

## License

MIT © headlessButSmart

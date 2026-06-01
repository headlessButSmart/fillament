# @fillament/core

Framework-agnostic form engine for [Fillament](https://github.com/headlessButSmart/fillament). State, field registry, validation orchestration, path utilities, and subscriptions — everything a React (or other framework) binding needs.

```bash
pnpm add @fillament/core
```

```ts
import { createForm } from "@fillament/core";

const form = createForm({
  defaultValues: { email: "" },
});

form.setValue("email", "a@a.com");
console.log(form.getState().values); // { email: "a@a.com" }
```

For React, use [`@fillament/react`](https://github.com/headlessButSmart/fillament/tree/main/packages/react) instead — it wraps this engine with hooks and components.

See the [project README](https://github.com/headlessButSmart/fillament#readme) for the full picture.

## License

MIT © headlessButSmart

# @fillament/zod

Zod validation adapter for [Fillament](https://github.com/headlessButSmart/fillament).

```bash
pnpm add @fillament/zod zod
```

```ts
import { z } from "zod";
import { useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";

const Schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const form = useForm({
  schema: zodAdapter(Schema),
});
```

Errors are mapped onto Fillament's dot-paths (`address.city`, `contacts.0.name`) automatically, including field-level validation via the `validateField` hook.

## License

MIT © headlessButSmart

# @fillament/yup

Yup validation adapter for [Fillament](https://github.com/headlessButSmart/fillament).

```bash
pnpm add @fillament/yup yup
```

```ts
import * as yup from "yup";
import { useForm } from "@fillament/react";
import { yupAdapter } from "@fillament/yup";

const Schema = yup.object({
  email: yup.string().email().required(),
  age: yup.number().min(18).required(),
});

const form = useForm({
  schema: yupAdapter(Schema),
});
```

Yup's bracket-syntax paths (`contacts[0].name`) are normalized to Fillament's dot-paths (`contacts.0.name`) so error mapping just works. Field-level validation uses `schema.validateAt` when available.

## License

MIT © headlessButSmart

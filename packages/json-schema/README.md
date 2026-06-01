# @fillament/json-schema

JSON Schema validation adapter for [Fillament](https://github.com/headlessButSmart/fillament). Backed by [AJV](https://ajv.js.org) with [`ajv-formats`](https://github.com/ajv-validator/ajv-formats) bundled in.

```bash
pnpm add @fillament/json-schema
```

```ts
import { useForm } from "@fillament/react";
import { jsonSchemaAdapter } from "@fillament/json-schema";

const schema = {
  type: "object",
  required: ["email", "age"],
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18 },
    contacts: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", minLength: 1 } },
      },
    },
  },
};

const form = useForm({ schema: jsonSchemaAdapter(schema) });
```

AJV instance can be shared across forms (custom keywords, formats, etc.):

```ts
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addKeyword({ keyword: "isEmployeeNumber", validate: /* ... */ });

const adapter = jsonSchemaAdapter(schema, { ajv });
```

## License

MIT © headlessButSmart

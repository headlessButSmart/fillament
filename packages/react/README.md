# @fillament/react

React bindings for [Fillament](https://github.com/headlessButSmart/fillament) — `useForm`, `Form`, `Field`, `FieldArray`, `FieldsRenderer`, `useField`, `useFieldState`, `useWatch`, `FormProvider`, `createComponentAdapter`.

```bash
pnpm add @fillament/react @fillament/zod   # or yup / json-schema
```

```tsx
import { z } from "zod";
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
    <Form form={form} onSubmit={(values) => console.log(values)}>
      <Field name="email" label="Email" type="email" />
      <Field name="firstName" label="First name" />
      <button type="submit">Save</button>
    </Form>
  );
}
```

See the [project README](https://github.com/headlessButSmart/fillament#readme) for features, comparisons, and the full Storybook of examples.

## License

MIT © headlessButSmart

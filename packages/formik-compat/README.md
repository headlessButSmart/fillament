# @fillament/formik-compat

Drop-in [Formik](https://formik.org) compatibility layer for [Fillament](https://github.com/headlessButSmart/fillament). Implements `<Formik>`, `useFormik`, `<Field>`, `<ErrorMessage>`, `useFormikContext`, plus the full helper bag (`setFieldValue`, `setFieldTouched`, `setFieldError`, `setValues`, `setErrors`, `setTouched`, `resetForm`, `submitForm`, `validateForm`, `validateField`, `getFieldProps`, `getFieldMeta`).

```bash
pnpm add @fillament/formik-compat
```

```diff
- import { Formik, useFormik } from "formik";
+ import { Formik, useFormik } from "@fillament/formik-compat";
```

Auto-detects **Yup**, **Zod**, and pre-built **Fillament adapters** passed via `validationSchema`. Unsupported Formik props (`innerRef`, `connect()` HOC, `<FastField>`, …) log a development warning instead of failing silently.

```tsx
<Formik
  initialValues={{ email: "" }}
  validationSchema={YupOrZodSchema}
  onSubmit={save}
>
  {(formik) => (
    <form onSubmit={formik.handleSubmit}>
      <input
        name="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
      <button type="submit">Save</button>
    </form>
  )}
</Formik>
```

When you're ready, drop the `-compat` wrapper and switch to the native [`@fillament/react`](https://github.com/headlessButSmart/fillament/tree/main/packages/react) API on your own schedule.

## License

MIT © headlessButSmart

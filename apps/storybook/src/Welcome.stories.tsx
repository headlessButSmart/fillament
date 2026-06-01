import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Welcome",
};
export default meta;

type Story = StoryObj;

export const Intro: Story = {
  render: () => (
    <div className="fl-demo">
      <h2>Fillament</h2>
      <p className="subtitle">Type-safe forms for complex React flows.</p>
      <p>
        Fillament is a modern Formik alternative for large React teams. It gives
        developers type-safe fields, high-performance rendering, first-class
        conditional flows, built-in DevTools, privacy-safe analytics, and a safe
        migration path from Formik.
      </p>
      <h3>Explore the stories</h3>
      <ul>
        <li><strong>Basic / Zod form</strong> — minimal form with Zod validation</li>
        <li><strong>Conditional fields</strong> — fields that mount only when needed</li>
        <li><strong>Field array</strong> — dynamic rows with stable identity</li>
        <li><strong>Server validation</strong> — debounced async validation</li>
        <li><strong>Design-system adapter</strong> — register UI components once</li>
        <li><strong>Analytics</strong> — privacy-safe event redaction</li>
        <li><strong>DevTools</strong> — inspect forms in the browser</li>
        <li><strong>Performance</strong> — granular subscriptions in a 100-field form</li>
        <li><strong>Wizard</strong> — multi-step with hidden-step preservation</li>
      </ul>
    </div>
  ),
};

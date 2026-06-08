import type { FillamentBlueprint, BlueprintFieldSchema, BlueprintBaseOptions } from "../types.js";
import { buildBlueprint } from "../util.js";

export interface ContactValues {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactBlueprintOptions extends BlueprintBaseOptions<ContactValues> {
  includeSubject?: boolean;
}

export function contactBlueprint(
  options: ContactBlueprintOptions = {}
): FillamentBlueprint<ContactValues> {
  const fields: BlueprintFieldSchema[] = [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
  ];
  const defaults: Partial<ContactValues> = { name: "", email: "", message: "" };
  if (options.includeSubject) {
    fields.push({ name: "subject", type: "text" });
    defaults.subject = "";
  }
  fields.push({ name: "message", type: "textarea", required: true, minLength: 10 });
  return buildBlueprint<ContactValues>(
    fields,
    defaults,
    options,
    {
      name: "Your name",
      email: "Email",
      subject: "Subject",
      message: "Message",
      submit: "Send message",
    },
    { kind: "contact.message" }
  );
}

export interface NewsletterValues {
  email: string;
  consent: boolean;
}

export function newsletterSignupBlueprint(
  options: BlueprintBaseOptions<NewsletterValues> = {}
): FillamentBlueprint<NewsletterValues> {
  return buildBlueprint<NewsletterValues>(
    [
      { name: "email", type: "email", required: true },
      { name: "consent", type: "checkbox", required: true },
    ],
    { email: "", consent: false },
    options,
    {
      email: "Email",
      consent: "I agree to receive newsletter emails",
      submit: "Subscribe",
    },
    { kind: "contact.newsletter" }
  );
}

export interface WaitlistValues {
  email: string;
  name?: string;
  company?: string;
}

export interface WaitlistBlueprintOptions extends BlueprintBaseOptions<WaitlistValues> {
  includeCompany?: boolean;
  includeName?: boolean;
}

export function waitlistBlueprint(
  options: WaitlistBlueprintOptions = {}
): FillamentBlueprint<WaitlistValues> {
  const fields: BlueprintFieldSchema[] = [];
  const defaults: Partial<WaitlistValues> = { email: "" };
  if (options.includeName) {
    fields.push({ name: "name", type: "text", required: true });
    defaults.name = "";
  }
  fields.push({ name: "email", type: "email", required: true });
  if (options.includeCompany) {
    fields.push({ name: "company", type: "text" });
    defaults.company = "";
  }
  return buildBlueprint<WaitlistValues>(
    fields,
    defaults,
    options,
    {
      name: "Name",
      email: "Email",
      company: "Company",
      submit: "Join waitlist",
    },
    { kind: "contact.waitlist" }
  );
}

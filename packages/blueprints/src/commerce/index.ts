// Commerce blueprints intentionally exclude raw card details (number/cvc/expiry)
// — those fields belong in a PCI-compliant provider's iframe/Element (Stripe
// Elements, Paddle, Adyen, etc.) and never on the form bus.
import type { FillamentBlueprint, BlueprintFieldSchema, BlueprintBaseOptions } from "../types.js";
import { buildBlueprint } from "../util.js";

export interface AddressValues {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface AddressBlueprintOptions extends BlueprintBaseOptions<AddressValues> {
  includePhone?: boolean;
  countries?: Array<{ label: string; value: string }>;
}

export function addressBlueprint(
  options: AddressBlueprintOptions = {}
): FillamentBlueprint<AddressValues> {
  const fields: BlueprintFieldSchema[] = [
    { name: "fullName", type: "text", required: true },
    { name: "line1", type: "text", required: true },
    { name: "line2", type: "text" },
    { name: "city", type: "text", required: true },
    { name: "region", type: "text" },
    { name: "postalCode", type: "text", required: true },
    { name: "country", type: "select", required: true, options: options.countries },
  ];
  if (options.includePhone) {
    fields.push({ name: "phone", type: "tel" });
  }
  return buildBlueprint<AddressValues>(
    fields,
    {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      phone: "",
    },
    options,
    {
      fullName: "Full name",
      line1: "Address",
      line2: "Apartment, suite, etc. (optional)",
      city: "City",
      region: "State / Province",
      postalCode: "Postal code",
      country: "Country",
      phone: "Phone (optional)",
      submit: "Save address",
    },
    { kind: "commerce.address" }
  );
}

export const billingAddressBlueprint = (options: AddressBlueprintOptions = {}) => {
  const bp = addressBlueprint(options);
  return { ...bp, metadata: { ...bp.metadata, kind: "commerce.billingAddress" } };
};

export interface OrderItem {
  sku: string;
  qty: number;
}

export interface OrderValues {
  customerEmail: string;
  customerName: string;
  phone?: string;
  shippingLine1: string;
  shippingLine2?: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingMethod: "standard" | "express" | "overnight" | string;
  couponCode?: string;
  giftWrap?: boolean;
  notes?: string;
  termsAccepted: boolean;
  items: OrderItem[];
}

export interface OrderBlueprintOptions extends BlueprintBaseOptions<OrderValues> {
  /** Include the free-form `notes` field. Defaults to true. */
  includeNotes?: boolean;
  /** Include the optional `phone` field. Defaults to true. */
  includePhone?: boolean;
  /** Include the optional `couponCode` field. Defaults to true. */
  includeCoupon?: boolean;
  /** Include the optional `giftWrap` checkbox. Defaults to true. */
  includeGiftWrap?: boolean;
  /** Require the terms-accepted checkbox. Defaults to true. */
  requireTerms?: boolean;
  countries?: Array<{ label: string; value: string }>;
  shippingMethods?: Array<{ label: string; value: string }>;
}

export function orderBlueprint(
  options: OrderBlueprintOptions = {}
): FillamentBlueprint<OrderValues> {
  // Payment fields intentionally excluded — collect via Stripe Elements, Paddle,
  // Adyen, or another PCI-compliant provider. See docs/blueprints.md.
  const includeNotes = options.includeNotes ?? true;
  const includePhone = options.includePhone ?? true;
  const includeCoupon = options.includeCoupon ?? true;
  const includeGiftWrap = options.includeGiftWrap ?? true;
  const requireTerms = options.requireTerms ?? true;

  const countries = options.countries ?? [
    { label: "United States", value: "US" },
    { label: "United Kingdom", value: "GB" },
    { label: "Portugal", value: "PT" },
    { label: "Spain", value: "ES" },
    { label: "France", value: "FR" },
    { label: "Germany", value: "DE" },
  ];

  const shippingMethods = options.shippingMethods ?? [
    { label: "Standard (3–5 business days)", value: "standard" },
    { label: "Express (1–2 business days)", value: "express" },
    { label: "Overnight", value: "overnight" },
  ];

  const fields: BlueprintFieldSchema[] = [
    { name: "customerEmail", type: "email", required: true },
    { name: "customerName", type: "text", required: true },
  ];

  if (includePhone) {
    fields.push({ name: "phone", type: "tel" });
  }

  fields.push(
    { name: "shippingLine1", type: "text", required: true },
    { name: "shippingLine2", type: "text" },
    { name: "shippingCity", type: "text", required: true },
    { name: "shippingPostalCode", type: "text", required: true },
    { name: "shippingCountry", type: "select", required: true, options: countries },
    { name: "shippingMethod", type: "select", required: true, options: shippingMethods }
  );

  if (includeCoupon) {
    fields.push({ name: "couponCode", type: "text" });
  }
  if (includeGiftWrap) {
    fields.push({ name: "giftWrap", type: "checkbox" });
  }
  if (includeNotes) {
    fields.push({ name: "notes", type: "textarea" });
  }
  if (requireTerms) {
    fields.push({ name: "termsAccepted", type: "checkbox", required: true });
  }

  const defaults: Partial<OrderValues> = {
    customerEmail: "",
    customerName: "",
    phone: "",
    shippingLine1: "",
    shippingLine2: "",
    shippingCity: "",
    shippingPostalCode: "",
    shippingCountry: countries[0]?.value ?? "",
    shippingMethod: shippingMethods[0]?.value ?? "standard",
    couponCode: "",
    giftWrap: false,
    notes: "",
    termsAccepted: false,
    items: [],
  };

  return buildBlueprint<OrderValues>(
    fields,
    defaults,
    options,
    {
      customerEmail: "Email",
      customerName: "Full name",
      phone: "Phone (optional)",
      shippingLine1: "Shipping address",
      shippingLine2: "Apartment, suite, etc. (optional)",
      shippingCity: "City",
      shippingPostalCode: "Postal code",
      shippingCountry: "Country",
      shippingMethod: "Shipping method",
      couponCode: "Coupon code (optional)",
      giftWrap: "Gift wrap this order",
      notes: "Order notes (optional)",
      termsAccepted: "I agree to the terms and the privacy policy",
      submit: "Place order",
    },
    {
      kind: "commerce.order",
      paymentNote:
        "Payment details (card number, CVC, expiry) are NOT collected here — wire a PCI-compliant provider (Stripe Elements, Paddle, Adyen) for those fields.",
    }
  );
}

export interface SubscriptionValues {
  email: string;
  plan: string;
  billingCycle: "monthly" | "yearly";
}

export interface SubscriptionBlueprintOptions extends BlueprintBaseOptions<SubscriptionValues> {
  plans?: Array<{ label: string; value: string }>;
}

export function subscriptionBlueprint(
  options: SubscriptionBlueprintOptions = {}
): FillamentBlueprint<SubscriptionValues> {
  const plans = options.plans ?? [
    { label: "Starter", value: "starter" },
    { label: "Pro", value: "pro" },
    { label: "Business", value: "business" },
  ];
  return buildBlueprint<SubscriptionValues>(
    [
      { name: "email", type: "email", required: true },
      { name: "plan", type: "select", required: true, options: plans },
      {
        name: "billingCycle",
        type: "select",
        required: true,
        options: [
          { label: "Monthly", value: "monthly" },
          { label: "Yearly (save 20%)", value: "yearly" },
        ],
      },
    ],
    { email: "", plan: plans[0]?.value ?? "starter", billingCycle: "monthly" },
    options,
    {
      email: "Email",
      plan: "Plan",
      billingCycle: "Billing",
      submit: "Start subscription",
    },
    {
      kind: "commerce.subscription",
      paymentNote:
        "Payment details are NOT collected here. Use Stripe Elements / Paddle / Adyen for PCI-safe card capture.",
    }
  );
}

export interface QuoteRequestValues {
  companyName: string;
  contactName: string;
  email: string;
  estimatedSeats?: number;
  message?: string;
}

export function quoteRequestBlueprint(
  options: BlueprintBaseOptions<QuoteRequestValues> = {}
): FillamentBlueprint<QuoteRequestValues> {
  return buildBlueprint<QuoteRequestValues>(
    [
      { name: "companyName", type: "text", required: true },
      { name: "contactName", type: "text", required: true },
      { name: "email", type: "email", required: true },
      { name: "estimatedSeats", type: "number", min: 1 },
      { name: "message", type: "textarea" },
    ],
    {
      companyName: "",
      contactName: "",
      email: "",
      estimatedSeats: undefined,
      message: "",
    },
    options,
    {
      companyName: "Company",
      contactName: "Your name",
      email: "Work email",
      estimatedSeats: "Estimated seats",
      message: "Tell us about your needs",
      submit: "Request a quote",
    },
    { kind: "commerce.quote" }
  );
}

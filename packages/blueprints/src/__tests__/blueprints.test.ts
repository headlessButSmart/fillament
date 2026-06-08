import { describe, it, expect } from "vitest";
import {
  loginBlueprint,
  signupBlueprint,
  forgotPasswordBlueprint,
  resetPasswordBlueprint,
  twoFactorBlueprint,
} from "../auth/index.js";
import {
  contactBlueprint,
  newsletterSignupBlueprint,
  waitlistBlueprint,
} from "../contact/index.js";
import {
  satisfactionSurveyBlueprint,
  npsSurveyBlueprint,
  feedbackBlueprint,
} from "../survey/index.js";
import {
  addressBlueprint,
  billingAddressBlueprint,
  orderBlueprint,
  subscriptionBlueprint,
  quoteRequestBlueprint,
} from "../commerce/index.js";
import {
  profileOnboardingBlueprint,
  teamInviteBlueprint,
  workspaceSetupBlueprint,
} from "../onboarding/index.js";

describe("auth blueprints", () => {
  it("loginBlueprint omits username when usernameOrEmail is 'email' (default)", () => {
    const bp = loginBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toContain("email");
    expect(names).toContain("password");
    expect(names).not.toContain("username");
  });

  it("loginBlueprint includes rememberMe only when opted in", () => {
    expect(loginBlueprint({ rememberMe: true }).schema.fields.some((f) => f.name === "rememberMe")).toBe(true);
    expect(loginBlueprint().schema.fields.some((f) => f.name === "rememberMe")).toBe(false);
  });

  it("loginBlueprint includes both email + username when 'both'", () => {
    const bp = loginBlueprint({ usernameOrEmail: "both" });
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toContain("email");
    expect(names).toContain("username");
  });

  it("signupBlueprint adds optional sections when toggled", () => {
    const bp = signupBlueprint({
      includeName: true,
      confirmPassword: true,
      requireTerms: true,
      marketingOptIn: true,
    });
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toContain("fullName");
    expect(names).toContain("passwordConfirm");
    expect(names).toContain("acceptTerms");
    expect(names).toContain("marketingOptIn");
  });

  it("supports label overrides", () => {
    const bp = loginBlueprint({ labels: { email: "Work email", submit: "Sign in to work" } });
    expect(bp.labels?.email).toBe("Work email");
    expect(bp.labels?.submit).toBe("Sign in to work");
  });

  it("supports defaultValues overrides", () => {
    const bp = signupBlueprint({ marketingOptIn: true, defaultValues: { marketingOptIn: true } });
    expect(bp.defaultValues.marketingOptIn).toBe(true);
  });

  it("forgotPasswordBlueprint exposes only email", () => {
    const bp = forgotPasswordBlueprint();
    expect(bp.schema.fields.map((f) => f.name)).toEqual(["email"]);
  });

  it("resetPasswordBlueprint requires confirmation", () => {
    const bp = resetPasswordBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toEqual(["password", "passwordConfirm"]);
  });

  it("twoFactorBlueprint enforces digit constraints", () => {
    const bp = twoFactorBlueprint({ digits: 6 });
    const code = bp.schema.fields.find((f) => f.name === "code")!;
    expect(code.minLength).toBe(6);
    expect(code.maxLength).toBe(6);
  });
});

describe("contact blueprints", () => {
  it("contactBlueprint includes name/email/message", () => {
    const bp = contactBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toEqual(["name", "email", "message"]);
  });

  it("contactBlueprint adds subject when requested", () => {
    const bp = contactBlueprint({ includeSubject: true });
    expect(bp.schema.fields.map((f) => f.name)).toContain("subject");
  });

  it("newsletterSignupBlueprint requires email + consent", () => {
    const bp = newsletterSignupBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toEqual(["email", "consent"]);
  });

  it("waitlistBlueprint conditionally includes name/company", () => {
    const bp = waitlistBlueprint({ includeName: true, includeCompany: true });
    const names = bp.schema.fields.map((f) => f.name);
    expect(names).toEqual(["name", "email", "company"]);
  });
});

describe("survey blueprints", () => {
  it("satisfactionSurveyBlueprint defaults to 5-point scale", () => {
    const bp = satisfactionSurveyBlueprint();
    const rating = bp.schema.fields.find((f) => f.name === "rating")!;
    expect(rating.max).toBe(5);
  });

  it("satisfactionSurveyBlueprint respects custom scale", () => {
    const bp = satisfactionSurveyBlueprint({ scale: 10 });
    expect(bp.schema.fields.find((f) => f.name === "rating")!.max).toBe(10);
  });

  it("npsSurveyBlueprint constrains score to 0-10", () => {
    const score = npsSurveyBlueprint().schema.fields.find((f) => f.name === "score")!;
    expect(score.min).toBe(0);
    expect(score.max).toBe(10);
  });

  it("feedbackBlueprint uses default categories", () => {
    const cat = feedbackBlueprint().schema.fields.find((f) => f.name === "category")!;
    expect(cat.options?.map((o) => o.value)).toEqual(["bug", "feature", "general"]);
  });
});

describe("commerce blueprints", () => {
  it("addressBlueprint includes core address fields", () => {
    const bp = addressBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    for (const n of ["fullName", "line1", "city", "postalCode", "country"]) {
      expect(names).toContain(n);
    }
  });

  it("addressBlueprint adds phone only when requested", () => {
    expect(addressBlueprint().schema.fields.some((f) => f.name === "phone")).toBe(false);
    expect(addressBlueprint({ includePhone: true }).schema.fields.some((f) => f.name === "phone")).toBe(true);
  });

  it("billingAddressBlueprint marks itself as billing", () => {
    const bp = billingAddressBlueprint();
    expect(bp.metadata?.kind).toBe("commerce.billingAddress");
  });

  it("orderBlueprint never contains raw card fields", () => {
    const bp = orderBlueprint({ includeNotes: true });
    const forbidden = ["cardNumber", "cardCvc", "cardCvv", "cvc", "cvv", "cardExpiry", "expiry"];
    for (const f of bp.schema.fields) {
      expect(forbidden.includes(f.name)).toBe(false);
    }
    expect(bp.metadata?.paymentNote).toBeTruthy();
  });

  it("subscriptionBlueprint never contains raw card fields", () => {
    const bp = subscriptionBlueprint();
    const forbidden = ["cardNumber", "cardCvc", "cardCvv", "cvc", "cvv", "cardExpiry"];
    for (const f of bp.schema.fields) {
      expect(forbidden.includes(f.name)).toBe(false);
    }
  });

  it("quoteRequestBlueprint asks for company + contact info", () => {
    const bp = quoteRequestBlueprint();
    const names = bp.schema.fields.map((f) => f.name);
    for (const n of ["companyName", "contactName", "email"]) {
      expect(names).toContain(n);
    }
  });
});

describe("onboarding blueprints", () => {
  it("profileOnboardingBlueprint includes name + role by default", () => {
    const bp = profileOnboardingBlueprint();
    expect(bp.schema.fields.map((f) => f.name)).toEqual(["fullName", "role"]);
  });

  it("teamInviteBlueprint exposes invites default", () => {
    const bp = teamInviteBlueprint();
    expect(bp.defaultValues.invites?.length).toBe(1);
  });

  it("workspaceSetupBlueprint enforces a slug pattern", () => {
    const bp = workspaceSetupBlueprint();
    const slug = bp.schema.fields.find((f) => f.name === "slug")!;
    expect(slug.pattern).toBeTruthy();
  });
});

describe("blueprint shape stability", () => {
  it("every blueprint returns { schema, defaultValues, labels, metadata }", () => {
    const blueprints = [
      loginBlueprint(),
      signupBlueprint(),
      forgotPasswordBlueprint(),
      resetPasswordBlueprint(),
      twoFactorBlueprint(),
      contactBlueprint(),
      newsletterSignupBlueprint(),
      waitlistBlueprint(),
      satisfactionSurveyBlueprint(),
      npsSurveyBlueprint(),
      feedbackBlueprint(),
      addressBlueprint(),
      billingAddressBlueprint(),
      orderBlueprint(),
      subscriptionBlueprint(),
      quoteRequestBlueprint(),
      profileOnboardingBlueprint(),
      teamInviteBlueprint(),
      workspaceSetupBlueprint(),
    ];
    for (const bp of blueprints) {
      expect(bp.schema).toBeDefined();
      expect(bp.schema.type).toBe("object");
      expect(Array.isArray(bp.schema.fields)).toBe(true);
      expect(bp.defaultValues).toBeDefined();
      expect(bp.labels).toBeDefined();
      expect(bp.metadata).toBeDefined();
    }
  });
});

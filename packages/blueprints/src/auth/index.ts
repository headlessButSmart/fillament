import type { FillamentBlueprint, BlueprintFieldSchema, BlueprintBaseOptions } from "../types.js";
import { buildBlueprint } from "../util.js";

export interface LoginValues {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginBlueprintOptions extends BlueprintBaseOptions<LoginValues> {
  rememberMe?: boolean;
  forgotPassword?: boolean;
  usernameOrEmail?: "email" | "username" | "both";
}

export function loginBlueprint(
  options: LoginBlueprintOptions = {}
): FillamentBlueprint<LoginValues> {
  const mode = options.usernameOrEmail ?? "email";
  const fields: BlueprintFieldSchema[] = [];
  const defaults: Partial<LoginValues> = { password: "" };
  if (mode === "email" || mode === "both") {
    fields.push({ name: "email", type: "email", required: true });
    defaults.email = "";
  }
  if (mode === "username" || mode === "both") {
    fields.push({ name: "username", type: "text", required: true });
    defaults.username = "";
  }
  fields.push({ name: "password", type: "password", required: true, minLength: 8 });
  if (options.rememberMe) {
    fields.push({ name: "rememberMe", type: "checkbox" });
    defaults.rememberMe = false;
  }
  return buildBlueprint<LoginValues>(
    fields,
    defaults,
    options,
    {
      email: "Email",
      username: "Username",
      password: "Password",
      rememberMe: "Remember me",
      submit: "Sign in",
    },
    { kind: "auth.login", forgotPassword: options.forgotPassword ?? false }
  );
}

export interface SignupValues {
  email: string;
  password: string;
  passwordConfirm?: string;
  fullName?: string;
  acceptTerms?: boolean;
  marketingOptIn?: boolean;
}

export interface SignupBlueprintOptions extends BlueprintBaseOptions<SignupValues> {
  includeName?: boolean;
  requireTerms?: boolean;
  confirmPassword?: boolean;
  marketingOptIn?: boolean;
}

export function signupBlueprint(
  options: SignupBlueprintOptions = {}
): FillamentBlueprint<SignupValues> {
  const fields: BlueprintFieldSchema[] = [];
  const defaults: Partial<SignupValues> = { email: "", password: "" };
  if (options.includeName) {
    fields.push({ name: "fullName", type: "text", required: true });
    defaults.fullName = "";
  }
  fields.push(
    { name: "email", type: "email", required: true },
    { name: "password", type: "password", required: true, minLength: 8 }
  );
  if (options.confirmPassword) {
    fields.push({ name: "passwordConfirm", type: "password", required: true, minLength: 8 });
    defaults.passwordConfirm = "";
  }
  if (options.requireTerms) {
    fields.push({ name: "acceptTerms", type: "checkbox", required: true });
    defaults.acceptTerms = false;
  }
  if (options.marketingOptIn) {
    fields.push({ name: "marketingOptIn", type: "checkbox" });
    defaults.marketingOptIn = false;
  }
  return buildBlueprint<SignupValues>(
    fields,
    defaults,
    options,
    {
      fullName: "Full name",
      email: "Email",
      password: "Password",
      passwordConfirm: "Confirm password",
      acceptTerms: "I agree to the terms",
      marketingOptIn: "Send me product updates",
      submit: "Create account",
    },
    { kind: "auth.signup" }
  );
}

export interface ForgotPasswordValues {
  email: string;
}

export function forgotPasswordBlueprint(
  options: BlueprintBaseOptions<ForgotPasswordValues> = {}
): FillamentBlueprint<ForgotPasswordValues> {
  return buildBlueprint<ForgotPasswordValues>(
    [{ name: "email", type: "email", required: true }],
    { email: "" },
    options,
    { email: "Email", submit: "Send reset link" },
    { kind: "auth.forgotPassword" }
  );
}

export interface ResetPasswordValues {
  password: string;
  passwordConfirm: string;
}

export function resetPasswordBlueprint(
  options: BlueprintBaseOptions<ResetPasswordValues> = {}
): FillamentBlueprint<ResetPasswordValues> {
  return buildBlueprint<ResetPasswordValues>(
    [
      { name: "password", type: "password", required: true, minLength: 8 },
      { name: "passwordConfirm", type: "password", required: true, minLength: 8 },
    ],
    { password: "", passwordConfirm: "" },
    options,
    { password: "New password", passwordConfirm: "Confirm new password", submit: "Reset password" },
    { kind: "auth.resetPassword" }
  );
}

export interface TwoFactorValues {
  code: string;
}

export interface TwoFactorBlueprintOptions extends BlueprintBaseOptions<TwoFactorValues> {
  digits?: number;
}

export function twoFactorBlueprint(
  options: TwoFactorBlueprintOptions = {}
): FillamentBlueprint<TwoFactorValues> {
  const digits = options.digits ?? 6;
  return buildBlueprint<TwoFactorValues>(
    [
      {
        name: "code",
        type: "text",
        required: true,
        minLength: digits,
        maxLength: digits,
        pattern: `^\\d{${digits}}$`,
      },
    ],
    { code: "" },
    options,
    { code: "Verification code", submit: "Verify" },
    { kind: "auth.twoFactor", digits }
  );
}

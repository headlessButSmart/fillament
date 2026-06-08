import type { FillamentBlueprint, BlueprintFieldSchema, BlueprintBaseOptions } from "../types.js";
import { buildBlueprint } from "../util.js";

export interface ProfileOnboardingValues {
  fullName: string;
  role: string;
  company?: string;
  timezone?: string;
  bio?: string;
}

export interface ProfileOnboardingOptions extends BlueprintBaseOptions<ProfileOnboardingValues> {
  includeCompany?: boolean;
  includeTimezone?: boolean;
  includeBio?: boolean;
  roles?: Array<{ label: string; value: string }>;
}

export function profileOnboardingBlueprint(
  options: ProfileOnboardingOptions = {}
): FillamentBlueprint<ProfileOnboardingValues> {
  const roles = options.roles ?? [
    { label: "Engineering", value: "engineering" },
    { label: "Product", value: "product" },
    { label: "Design", value: "design" },
    { label: "Other", value: "other" },
  ];
  const fields: BlueprintFieldSchema[] = [
    { name: "fullName", type: "text", required: true },
    { name: "role", type: "select", required: true, options: roles },
  ];
  const defaults: Partial<ProfileOnboardingValues> = {
    fullName: "",
    role: roles[0]?.value ?? "other",
  };
  if (options.includeCompany) {
    fields.push({ name: "company", type: "text" });
    defaults.company = "";
  }
  if (options.includeTimezone) {
    fields.push({ name: "timezone", type: "text" });
    defaults.timezone = "";
  }
  if (options.includeBio) {
    fields.push({ name: "bio", type: "textarea" });
    defaults.bio = "";
  }
  return buildBlueprint<ProfileOnboardingValues>(
    fields,
    defaults,
    options,
    {
      fullName: "Your name",
      role: "Role",
      company: "Company",
      timezone: "Timezone",
      bio: "Tell us about yourself",
      submit: "Continue",
    },
    {
      kind: "onboarding.profile",
      steps: [
        { id: "basics", title: "Basics", fields: ["fullName", "role"] },
        { id: "details", title: "Details", fields: ["company", "timezone", "bio"] },
      ],
    }
  );
}

export interface TeamInviteValues {
  invites: Array<{ email: string; role: string }>;
}

export interface TeamInviteOptions extends BlueprintBaseOptions<TeamInviteValues> {
  defaultRole?: string;
  maxInvites?: number;
}

export function teamInviteBlueprint(
  options: TeamInviteOptions = {}
): FillamentBlueprint<TeamInviteValues> {
  return buildBlueprint<TeamInviteValues>(
    [],
    { invites: [{ email: "", role: options.defaultRole ?? "member" }] },
    options,
    {
      invitesEmail: "Email",
      invitesRole: "Role",
      submit: "Send invites",
    },
    {
      kind: "onboarding.teamInvite",
      arrayField: "invites",
      maxInvites: options.maxInvites ?? 20,
      itemFields: [
        { name: "email", type: "email", required: true },
        {
          name: "role",
          type: "select",
          required: true,
          options: [
            { label: "Member", value: "member" },
            { label: "Admin", value: "admin" },
          ],
        },
      ],
    }
  );
}

export interface WorkspaceSetupValues {
  workspaceName: string;
  slug: string;
  industry?: string;
  size?: string;
}

export interface WorkspaceSetupOptions extends BlueprintBaseOptions<WorkspaceSetupValues> {
  industries?: Array<{ label: string; value: string }>;
  sizes?: Array<{ label: string; value: string }>;
}

export function workspaceSetupBlueprint(
  options: WorkspaceSetupOptions = {}
): FillamentBlueprint<WorkspaceSetupValues> {
  const industries = options.industries ?? [
    { label: "SaaS", value: "saas" },
    { label: "E-commerce", value: "ecommerce" },
    { label: "Agency", value: "agency" },
    { label: "Other", value: "other" },
  ];
  const sizes = options.sizes ?? [
    { label: "1-10", value: "1-10" },
    { label: "11-50", value: "11-50" },
    { label: "51-200", value: "51-200" },
    { label: "200+", value: "200-plus" },
  ];
  return buildBlueprint<WorkspaceSetupValues>(
    [
      { name: "workspaceName", type: "text", required: true },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9-]+$" },
      { name: "industry", type: "select", options: industries },
      { name: "size", type: "select", options: sizes },
    ],
    { workspaceName: "", slug: "", industry: industries[0]?.value, size: sizes[0]?.value },
    options,
    {
      workspaceName: "Workspace name",
      slug: "URL slug",
      industry: "Industry",
      size: "Team size",
      submit: "Create workspace",
    },
    { kind: "onboarding.workspace" }
  );
}

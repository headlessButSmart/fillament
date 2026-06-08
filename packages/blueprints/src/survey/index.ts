import type { FillamentBlueprint, BlueprintFieldSchema, BlueprintBaseOptions } from "../types.js";
import { buildBlueprint } from "../util.js";

export interface SatisfactionValues {
  rating: number;
  easeOfUseRating?: number;
  supportRating?: number;
  valueRating?: number;
  recommendation?: "definitely" | "maybe" | "no" | string;
  mostUsedFeature?: string;
  improvements?: string;
  comment?: string;
  followUpEmail?: string;
  followUpConsent?: boolean;
}

export interface SatisfactionBlueprintOptions extends BlueprintBaseOptions<SatisfactionValues> {
  scale?: number;
  /** Include free-form `comment` field. Defaults to true. */
  includeComment?: boolean;
  /** Ask "How easy was it to use?". Defaults to true. */
  includeEaseOfUse?: boolean;
  /** Ask "How was customer support?". Defaults to true. */
  includeSupportRating?: boolean;
  /** Ask "Was the value for money fair?". Defaults to true. */
  includeValueRating?: boolean;
  /** Ask "Would you recommend us?". Defaults to true. */
  includeRecommendation?: boolean;
  /** Ask which feature is most used. Defaults to false. */
  includeMostUsedFeature?: boolean;
  /** Ask "What could we improve?". Defaults to true. */
  includeImprovements?: boolean;
  /** Collect an optional follow-up email + consent. Defaults to true. */
  includeFollowUp?: boolean;
  /** Override the list of feature options when includeMostUsedFeature is true. */
  features?: Array<{ label: string; value: string }>;
}

export function satisfactionSurveyBlueprint(
  options: SatisfactionBlueprintOptions = {}
): FillamentBlueprint<SatisfactionValues> {
  const scale = options.scale ?? 5;
  const includeComment = options.includeComment !== false;
  const includeEaseOfUse = options.includeEaseOfUse !== false;
  const includeSupportRating = options.includeSupportRating !== false;
  const includeValueRating = options.includeValueRating !== false;
  const includeRecommendation = options.includeRecommendation !== false;
  const includeMostUsedFeature = options.includeMostUsedFeature ?? false;
  const includeImprovements = options.includeImprovements !== false;
  const includeFollowUp = options.includeFollowUp !== false;

  const fields: BlueprintFieldSchema[] = [
    { name: "rating", type: "number", required: true, min: 1, max: scale },
  ];
  const defaults: Partial<SatisfactionValues> = { rating: 0 };

  if (includeEaseOfUse) {
    fields.push({ name: "easeOfUseRating", type: "number", min: 1, max: scale });
    defaults.easeOfUseRating = 0;
  }
  if (includeSupportRating) {
    fields.push({ name: "supportRating", type: "number", min: 1, max: scale });
    defaults.supportRating = 0;
  }
  if (includeValueRating) {
    fields.push({ name: "valueRating", type: "number", min: 1, max: scale });
    defaults.valueRating = 0;
  }
  if (includeRecommendation) {
    fields.push({
      name: "recommendation",
      type: "select",
      required: true,
      options: [
        { label: "Definitely", value: "definitely" },
        { label: "Maybe", value: "maybe" },
        { label: "No", value: "no" },
      ],
    });
    defaults.recommendation = "maybe";
  }
  if (includeMostUsedFeature) {
    const features = options.features ?? [
      { label: "Search", value: "search" },
      { label: "Dashboard", value: "dashboard" },
      { label: "Reports", value: "reports" },
      { label: "Integrations", value: "integrations" },
      { label: "Other", value: "other" },
    ];
    fields.push({ name: "mostUsedFeature", type: "select", options: features });
    defaults.mostUsedFeature = features[0]?.value ?? "other";
  }
  if (includeImprovements) {
    fields.push({ name: "improvements", type: "textarea" });
    defaults.improvements = "";
  }
  if (includeComment) {
    fields.push({ name: "comment", type: "textarea" });
    defaults.comment = "";
  }
  if (includeFollowUp) {
    fields.push(
      { name: "followUpEmail", type: "email" },
      { name: "followUpConsent", type: "checkbox" }
    );
    defaults.followUpEmail = "";
    defaults.followUpConsent = false;
  }

  return buildBlueprint<SatisfactionValues>(
    fields,
    defaults,
    options,
    {
      rating: `Overall, how satisfied are you? (1-${scale})`,
      easeOfUseRating: `How easy was the product to use? (1-${scale})`,
      supportRating: `How was customer support? (1-${scale})`,
      valueRating: `Was the value for money fair? (1-${scale})`,
      recommendation: "Would you recommend us to a colleague?",
      mostUsedFeature: "Which feature do you use most?",
      improvements: "What could we improve?",
      comment: "Anything else you'd like to share?",
      followUpEmail: "Email (optional, only used to follow up on your feedback)",
      followUpConsent: "It's OK to follow up about this feedback",
      submit: "Submit feedback",
    },
    { kind: "survey.satisfaction", scale }
  );
}

export interface NpsValues {
  score: number;
  reason?: string;
}

export interface NpsBlueprintOptions extends BlueprintBaseOptions<NpsValues> {
  includeReason?: boolean;
}

export function npsSurveyBlueprint(
  options: NpsBlueprintOptions = {}
): FillamentBlueprint<NpsValues> {
  const fields: BlueprintFieldSchema[] = [
    { name: "score", type: "number", required: true, min: 0, max: 10 },
  ];
  const defaults: Partial<NpsValues> = { score: 0 };
  if (options.includeReason !== false) {
    fields.push({ name: "reason", type: "textarea" });
    defaults.reason = "";
  }
  return buildBlueprint<NpsValues>(
    fields,
    defaults,
    options,
    {
      score: "How likely are you to recommend us? (0-10)",
      reason: "What's the main reason for your score?",
      submit: "Send",
    },
    { kind: "survey.nps" }
  );
}

export interface FeedbackValues {
  category: string;
  message: string;
  email?: string;
}

export interface FeedbackBlueprintOptions extends BlueprintBaseOptions<FeedbackValues> {
  categories?: Array<{ label: string; value: string }>;
  includeEmail?: boolean;
}

export function feedbackBlueprint(
  options: FeedbackBlueprintOptions = {}
): FillamentBlueprint<FeedbackValues> {
  const categories = options.categories ?? [
    { label: "Bug report", value: "bug" },
    { label: "Feature request", value: "feature" },
    { label: "General feedback", value: "general" },
  ];
  const fields: BlueprintFieldSchema[] = [
    { name: "category", type: "select", required: true, options: categories },
    { name: "message", type: "textarea", required: true, minLength: 10 },
  ];
  const defaults: Partial<FeedbackValues> = { category: categories[0]?.value ?? "general", message: "" };
  if (options.includeEmail) {
    fields.push({ name: "email", type: "email" });
    defaults.email = "";
  }
  return buildBlueprint<FeedbackValues>(
    fields,
    defaults,
    options,
    {
      category: "Type",
      message: "Tell us more",
      email: "Email (optional, for follow-up)",
      submit: "Send feedback",
    },
    { kind: "survey.feedback" }
  );
}

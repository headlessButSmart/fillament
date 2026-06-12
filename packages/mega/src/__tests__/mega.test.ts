import { describe, expect, it } from "vitest";

import * as core from "../index.js";
import * as react from "../react.js";
import * as zod from "../zod.js";
import * as yup from "../yup.js";
import * as jsonSchema from "../json-schema.js";
import * as ai from "../ai.js";
import * as webmcp from "../webmcp.js";
import * as webmcpMcpB from "../webmcp-mcp-b.js";
import * as blueprints from "../blueprints.js";
import * as blueprintsAuth from "../blueprints-auth.js";
import * as blueprintsContact from "../blueprints-contact.js";
import * as blueprintsSurvey from "../blueprints-survey.js";
import * as blueprintsCommerce from "../blueprints-commerce.js";
import * as blueprintsOnboarding from "../blueprints-onboarding.js";
import * as testData from "../test-data.js";
import * as testDataDevtools from "../test-data-devtools.js";
import * as persist from "../persist.js";
import * as remote from "../remote.js";
import * as redux from "../redux.js";
import * as i18n from "../i18n.js";
import * as analytics from "../analytics.js";
import * as devtools from "../devtools.js";
import * as formikCompat from "../formik-compat.js";

describe("@fillament/mega re-exports", () => {
  it("root entry re-exports core AND the React bindings", () => {
    expect(typeof core.createForm).toBe("function");
    expect(typeof core.createValidationAdapter).toBe("function");
    expect(typeof core.introspectForm).toBe("function");
    expect(typeof core.useForm).toBe("function");
    expect(core.Form).toBeDefined();
    expect(core.Field).toBeDefined();
  });

  it("bundled validator deps resolve without a manual install", async () => {
    const { z } = await import("zod");
    const yupLib = await import("yup");
    expect(typeof z.object).toBe("function");
    expect(typeof yupLib.object).toBe("function");
  });

  it("./react re-exports the React bindings", () => {
    expect(typeof react.useForm).toBe("function");
    expect(react.Form).toBeDefined();
    expect(react.Field).toBeDefined();
    expect(react.FieldArrayTable).toBeDefined();
  });

  it("./zod, ./yup, ./json-schema re-export the validation adapters", () => {
    expect(typeof zod.zodAdapter).toBe("function");
    expect(typeof yup.yupAdapter).toBe("function");
    expect(typeof jsonSchema.jsonSchemaAdapter).toBe("function");
  });

  it("./ai and ./webmcp re-export the AI surfaces", () => {
    expect(ai.FillamentAI).toBeDefined();
    expect(typeof webmcp.webmcpPlugin).toBe("function");
    expect(typeof webmcpMcpB.createMcpBRegistrar).toBe("function");
  });

  it("./blueprints re-exports every catalog", () => {
    expect(typeof blueprints.loginBlueprint).toBe("function");
    expect(typeof blueprintsAuth.loginBlueprint).toBe("function");
    expect(typeof blueprintsContact.contactBlueprint).toBe("function");
    expect(typeof blueprintsSurvey.npsSurveyBlueprint).toBe("function");
    expect(typeof blueprintsCommerce.addressBlueprint).toBe("function");
    expect(typeof blueprintsOnboarding.profileOnboardingBlueprint).toBe("function");
  });

  it("./test-data re-exports generators and the DevTools action", () => {
    expect(typeof testData.fillFormWithTestData).toBe("function");
    expect(typeof testData.generateTestValues).toBe("function");
    expect(typeof testDataDevtools.enableTestDataDevtools).toBe("function");
  });

  it("./persist, ./remote, ./redux re-export the data plugins", () => {
    expect(typeof persist.createStoragePersistPlugin).toBe("function");
    expect(typeof remote.remoteOptions).toBe("function");
    expect(typeof remote.remoteValidation).toBe("function");
    expect(typeof redux.createReduxBridge).toBe("function");
  });

  it("./i18n and ./analytics re-export the rich-feature modules", () => {
    expect(typeof i18n.createI18n).toBe("function");
    expect(typeof analytics.createAnalyticsPlugin).toBe("function");
  });

  it("./devtools and ./formik-compat re-export the DX modules", () => {
    expect(devtools.FillamentDevTools).toBeDefined();
    expect(formikCompat.Formik).toBeDefined();
    expect(typeof formikCompat.useFormik).toBe("function");
  });

  it("entries compose: a core form fills with seeded test data", () => {
    const form = core.createForm<{ email: string; age: number }>({
      defaultValues: { email: "", age: 0 },
    });
    testData.fillFormWithTestData(form, { seed: 42 });
    const values = form.getValues();
    expect(values.email).not.toBe("");
  });
});

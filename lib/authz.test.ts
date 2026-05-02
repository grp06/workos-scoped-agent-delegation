import { describe, expect, it } from "vitest";

import { evaluateAccess, getRequiredPermission } from "./authz";
import {
  AGENT_PERMISSIONS,
  DEMO_RESOURCE_IDS,
  WORKOS_DOCUMENT_PERMISSIONS,
} from "./demo-catalog";
import {
  financeAgentSeed,
  initialVisaPermissions,
  resourceSeeds,
} from "./demo-data";
import { getHumanPermission } from "./human-access";
import type { Agent, Resource, ToolAction } from "./types";

const agent = financeAgentSeed satisfies Agent;
const initialVisas = new Set<string>(initialVisaPermissions);
const invoiceExportVisas = new Set<string>([
  ...initialVisaPermissions,
  AGENT_PERMISSIONS.invoiceExport,
]);

function resource(id: string): Resource {
  const seed = resourceSeeds.find((candidate) => candidate.id === id);

  if (!seed) {
    throw new Error(`Missing test resource ${id}`);
  }

  return seed;
}

function checkWithVisas(
  action: ToolAction,
  resourceId: string,
  visas: Set<string>,
) {
  const target = resource(resourceId);
  const requiredPermission = getRequiredPermission(action, target);

  return evaluateAccess({
    agent,
    action,
    resource: target,
    humanAccess: {
      allowed: true,
      source: "workos_fga",
      requiredPermission: getHumanPermission(action),
      reason: `WorkOS FGA allows Alice to use ${getHumanPermission(action)} on ${target.name}.`,
    },
    agentVisaAllows: Boolean(
      requiredPermission && visas.has(requiredPermission),
    ),
  });
}

describe("authorization policy", () => {
  it("allows invoice search with the initial visa", () => {
    const result = checkWithVisas(
      "search_docs",
      DEMO_RESOURCE_IDS.q4Invoices,
      initialVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.invoiceRead);
    expect(result.humanRequiredPermission).toBe(
      WORKOS_DOCUMENT_PERMISSIONS.read,
    );
    expect(result.decision).toBe("allowed");
  });

  it("allows invoice summarization with the initial visa", () => {
    const result = checkWithVisas(
      "summarize_document",
      DEMO_RESOURCE_IDS.q4Invoices,
      initialVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.invoiceSummarize);
    expect(result.humanRequiredPermission).toBe(
      WORKOS_DOCUMENT_PERMISSIONS.summarize,
    );
    expect(result.decision).toBe("allowed");
  });

  it("denies payroll export with the initial visa", () => {
    const result = checkWithVisas(
      "export_csv",
      DEMO_RESOURCE_IDS.payroll,
      initialVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.payrollExport);
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks payroll.export");
  });

  it("denies invoice export before granting invoice.export", () => {
    const result = checkWithVisas(
      "export_csv",
      DEMO_RESOURCE_IDS.q4Invoices,
      initialVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.invoiceExport);
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks invoice.export");
  });

  it("allows invoice export after granting invoice.export", () => {
    const result = checkWithVisas(
      "export_csv",
      DEMO_RESOURCE_IDS.q4Invoices,
      invoiceExportVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.invoiceExport);
    expect(result.decision).toBe("allowed");
  });

  it("still denies payroll export after granting invoice.export", () => {
    const result = checkWithVisas(
      "export_csv",
      DEMO_RESOURCE_IDS.payroll,
      invoiceExportVisas,
    );

    expect(result.requiredPermission).toBe(AGENT_PERMISSIONS.payrollExport);
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks payroll.export");
  });
});

describe("human access gate", () => {
  it("denies when WorkOS FGA denies human access even if the agent visa allows", () => {
    const target = resource(DEMO_RESOURCE_IDS.q4Invoices);
    const result = evaluateAccess({
      agent,
      action: "export_csv",
      resource: target,
      humanAccess: {
        allowed: false,
        source: "workos_fga",
        requiredPermission: WORKOS_DOCUMENT_PERMISSIONS.export,
        reason: "WorkOS FGA says Alice lacks document:export.",
      },
      agentVisaAllows: true,
    });

    expect(result.humanHasAccess).toBe(false);
    expect(result.agentVisaAllows).toBe(true);
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("WorkOS FGA says Alice lacks");
  });
});

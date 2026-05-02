import { describe, expect, it } from "vitest";

import { evaluateAccess, getRequiredPermission } from "./authz";
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
  "invoice.export",
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
    const result = checkWithVisas("search_docs", "q4-invoices", initialVisas);

    expect(result.requiredPermission).toBe("invoice.read");
    expect(result.humanRequiredPermission).toBe("document:read");
    expect(result.decision).toBe("allowed");
  });

  it("allows invoice summarization with the initial visa", () => {
    const result = checkWithVisas(
      "summarize_document",
      "q4-invoices",
      initialVisas,
    );

    expect(result.requiredPermission).toBe("invoice.summarize");
    expect(result.humanRequiredPermission).toBe("document:summarize");
    expect(result.decision).toBe("allowed");
  });

  it("denies payroll export with the initial visa", () => {
    const result = checkWithVisas("export_csv", "payroll", initialVisas);

    expect(result.requiredPermission).toBe("payroll.export");
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks payroll.export");
  });

  it("denies invoice export before granting invoice.export", () => {
    const result = checkWithVisas("export_csv", "q4-invoices", initialVisas);

    expect(result.requiredPermission).toBe("invoice.export");
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks invoice.export");
  });

  it("allows invoice export after granting invoice.export", () => {
    const result = checkWithVisas(
      "export_csv",
      "q4-invoices",
      invoiceExportVisas,
    );

    expect(result.requiredPermission).toBe("invoice.export");
    expect(result.decision).toBe("allowed");
  });

  it("still denies payroll export after granting invoice.export", () => {
    const result = checkWithVisas("export_csv", "payroll", invoiceExportVisas);

    expect(result.requiredPermission).toBe("payroll.export");
    expect(result.decision).toBe("denied");
    expect(result.reason).toContain("Finance Agent lacks payroll.export");
  });
});

describe("human access gate", () => {
  it("denies when WorkOS FGA denies human access even if the agent visa allows", () => {
    const target = resource("q4-invoices");
    const result = evaluateAccess({
      agent,
      action: "export_csv",
      resource: target,
      humanAccess: {
        allowed: false,
        source: "workos_fga",
        requiredPermission: "document:export",
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

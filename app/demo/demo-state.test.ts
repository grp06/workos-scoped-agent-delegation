import { describe, expect, it } from "vitest";

import { getDemoSteps, getPreparedExport } from "./demo-state";
import {
  AGENT_PERMISSIONS,
  DEMO_RESOURCE_IDS,
  DOCUMENT_RESOURCE_TYPE,
  WORKOS_DOCUMENT_PERMISSIONS,
} from "@/lib/demo-catalog";
import type { AuditEvent, ToolCallResult } from "@/lib/types";

const initialVisas = [
  AGENT_PERMISSIONS.invoiceRead,
  AGENT_PERMISSIONS.invoiceSummarize,
];

const invoiceExportVisas = [
  ...initialVisas,
  AGENT_PERMISSIONS.invoiceExport,
];

function toolCall(
  overrides: Partial<ToolCallResult> = {},
): ToolCallResult {
  return {
    tool: "export_csv",
    resourceId: DEMO_RESOURCE_IDS.q4Invoices,
    resourceName: "q4-invoices.csv",
    humanHasAccess: true,
    humanAccessSource: "workos_fga",
    humanRequiredPermission: WORKOS_DOCUMENT_PERMISSIONS.export,
    agentVisaAllows: false,
    decision: "denied",
    reason: "Denied for test.",
    requiredPermission: AGENT_PERMISSIONS.invoiceExport,
    ...overrides,
  };
}

function auditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "audit_1",
    occurredAt: "2026-05-02T18:00:00.000Z",
    actorType: "agent",
    actorId: "finance-agent",
    action: "agent.tool_call.denied",
    targetType: DOCUMENT_RESOURCE_TYPE,
    targetId: DEMO_RESOURCE_IDS.q4Invoices,
    decision: "denied",
    reason: "Denied for test.",
    metadata: {},
    workosStatus: "not_sent",
    workosError: null,
    ...overrides,
  };
}

describe("getDemoSteps", () => {
  it("marks only signed-in complete before a mission runs", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [],
      activeVisas: initialVisas,
      auditEvents: [],
    });

    expect(steps.map((step) => [step.key, step.state])).toEqual([
      ["signedIn", "complete"],
      ["missionRun", "current"],
      ["exportBlocked", "pending"],
      ["visaGranted", "pending"],
      ["exportPrepared", "pending"],
      ["auditProof", "pending"],
    ]);
  });

  it("marks invoice export blocked after the first denied mission", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall()],
      activeVisas: initialVisas,
      auditEvents: [],
    });

    expect(steps.find((step) => step.key === "exportBlocked")?.state).toBe(
      "complete",
    );
    expect(steps.find((step) => step.key === "visaGranted")?.state).toBe(
      "current",
    );
    expect(steps.find((step) => step.key === "exportPrepared")?.state).toBe(
      "pending",
    );
  });

  it("marks visa granted before the second successful export", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall()],
      activeVisas: invoiceExportVisas,
      auditEvents: [],
    });

    expect(steps.find((step) => step.key === "visaGranted")?.state).toBe(
      "complete",
    );
    expect(steps.find((step) => step.key === "exportPrepared")?.state).toBe(
      "current",
    );
  });

  it("marks export and audit proof complete after sent audit events", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall({ decision: "allowed", agentVisaAllows: true })],
      activeVisas: invoiceExportVisas,
      auditEvents: [auditEvent({ workosStatus: "sent" })],
    });

    expect(steps.every((step) => step.state === "complete")).toBe(true);
  });

  it("requires a sent WorkOS event for audit proof", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall({ decision: "allowed", agentVisaAllows: true })],
      activeVisas: invoiceExportVisas,
      auditEvents: [auditEvent({ workosStatus: "failed" })],
    });

    expect(steps.find((step) => step.key === "auditProof")?.state).toBe(
      "current",
    );
  });
});

describe("getPreparedExport", () => {
  it("returns no artifact when invoice export is denied", () => {
    expect(getPreparedExport([toolCall()])).toBeNull();
  });

  it("returns an artifact when invoice export is allowed", () => {
    expect(
      getPreparedExport([
        toolCall({ decision: "allowed", agentVisaAllows: true }),
      ]),
    ).toEqual({
      filename: "q4-invoices.csv",
      permission: AGENT_PERMISSIONS.invoiceExport,
      detail: "Demo artifact only; no real file was created.",
    });
  });
});

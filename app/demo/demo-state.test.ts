import { describe, expect, it } from "vitest";

import {
  getDemoPhase,
  getDemoSteps,
  getInvoiceExportCheck,
  getInvoiceExportAuditProof,
  getPreparedExport,
  getRecentAuditEvents,
  presentAuditEvent,
} from "./demo-state";
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

const invoiceExportVisas = [...initialVisas, AGENT_PERMISSIONS.invoiceExport];

function toolCall(overrides: Partial<ToolCallResult> = {}): ToolCallResult {
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
      auditEvents: [
        auditEvent({
          action: "agent.tool_call.allowed",
          decision: "allowed",
          metadata: { tool: "export_csv" },
          workosStatus: "sent",
        }),
      ],
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

  it("does not mark audit proof complete before the export succeeds", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall()],
      activeVisas: initialVisas,
      auditEvents: [auditEvent({ workosStatus: "sent" })],
    });

    expect(steps.find((step) => step.key === "auditProof")?.state).toBe(
      "pending",
    );
  });

  it("does not mark audit proof complete from an unrelated sent event", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall({ decision: "allowed", agentVisaAllows: true })],
      activeVisas: invoiceExportVisas,
      auditEvents: [
        auditEvent({
          action: "demo.reset",
          decision: null,
          targetId: "scoped-agent-delegation",
          workosStatus: "sent",
        }),
      ],
    });

    expect(steps.find((step) => step.key === "auditProof")?.state).toBe(
      "current",
    );
  });

  it("does not mark audit proof complete when the matching export event failed to send", () => {
    const steps = getDemoSteps({
      signedInEmail: "alice@example.com",
      toolCalls: [toolCall({ decision: "allowed", agentVisaAllows: true })],
      activeVisas: invoiceExportVisas,
      auditEvents: [
        auditEvent({
          action: "agent.tool_call.allowed",
          decision: "allowed",
          metadata: { tool: "export_csv" },
          workosStatus: "failed",
        }),
      ],
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

describe("getInvoiceExportCheck", () => {
  it("prefers the allowed invoice export check when both old denied and new allowed calls exist", () => {
    expect(
      getInvoiceExportCheck([
        toolCall(),
        toolCall({ decision: "allowed", agentVisaAllows: true }),
      ])?.decision,
    ).toBe("allowed");
  });
});

describe("getRecentAuditEvents", () => {
  it("returns the newest audit events first even when the API returns oldest-first rows", () => {
    const events = [
      auditEvent({
        id: "audit_old",
        action: "agent.tool_call.denied",
        occurredAt: "2026-05-02T18:00:00.000Z",
      }),
      auditEvent({
        id: "audit_new",
        action: "agent.tool_call.allowed",
        occurredAt: "2026-05-02T18:05:00.000Z",
      }),
      auditEvent({
        id: "audit_middle",
        action: "agent.visa.granted",
        occurredAt: "2026-05-02T18:03:00.000Z",
      }),
    ];

    expect(getRecentAuditEvents(events, 2).map((event) => event.id)).toEqual([
      "audit_new",
      "audit_middle",
    ]);
  });
});

describe("getInvoiceExportAuditProof", () => {
  it("returns the newest sent allowed invoice export event instead of the latest unrelated event", () => {
    const proof = getInvoiceExportAuditProof([
      auditEvent({
        id: "audit_invoice_allowed",
        action: "agent.tool_call.allowed",
        decision: "allowed",
        targetId: DEMO_RESOURCE_IDS.q4Invoices,
        occurredAt: "2026-05-02T18:05:00.000Z",
        metadata: { tool: "export_csv" },
        workosStatus: "sent",
      }),
      auditEvent({
        id: "audit_payroll_denied",
        action: "agent.tool_call.denied",
        decision: "denied",
        targetId: DEMO_RESOURCE_IDS.payroll,
        occurredAt: "2026-05-02T18:06:00.000Z",
        workosStatus: "sent",
      }),
    ]);

    expect(proof?.id).toBe("audit_invoice_allowed");
  });

  it("ignores allowed invoice events from non-export tool calls", () => {
    expect(
      getInvoiceExportAuditProof([
        auditEvent({
          action: "agent.tool_call.allowed",
          decision: "allowed",
          targetId: DEMO_RESOURCE_IDS.q4Invoices,
          metadata: { tool: "search_docs" },
          workosStatus: "sent",
        }),
      ]),
    ).toBeUndefined();
  });

  it("ignores failed invoice export audit events", () => {
    expect(
      getInvoiceExportAuditProof([
        auditEvent({
          action: "agent.tool_call.allowed",
          decision: "allowed",
          metadata: { tool: "export_csv" },
          workosStatus: "failed",
        }),
      ]),
    ).toBeUndefined();
  });
});

describe("presentAuditEvent", () => {
  it("presents tool-call audit events in human-readable copy", () => {
    expect(
      presentAuditEvent(
        auditEvent({
          action: "agent.tool_call.denied",
          decision: "denied",
          targetId: DEMO_RESOURCE_IDS.payroll,
          metadata: {
            tool: "export_csv",
            resourceName: "payroll.xlsx",
            requiredPermission: AGENT_PERMISSIONS.payrollExport,
          },
          workosStatus: "sent",
        }),
      ),
    ).toEqual({
      title: "Denied export_csv on payroll.xlsx",
      detail: "agent.tool_call.denied; required payroll.export",
      status: "denied",
    });
  });

  it("falls back to raw audit details when an event is not a tool call", () => {
    expect(
      presentAuditEvent(
        auditEvent({
          action: "agent.visa.granted",
          actorType: "user",
          actorId: "alice",
          targetType: "agent",
          targetId: "finance-agent",
          decision: null,
          workosStatus: "sent",
        }),
      ),
    ).toEqual({
      title: "agent.visa.granted",
      detail: "user:alice -> agent:finance-agent",
      status: "sent",
    });
  });
});

describe("getDemoPhase", () => {
  it("stays ready when a persisted invoice visa exists but this page load has no mission result", () => {
    expect(
      getDemoPhase({
        activeVisas: invoiceExportVisas,
        toolCalls: [],
      }),
    ).toBe("ready");
  });

  it("moves to blocked only after an invoice export attempt is denied", () => {
    expect(
      getDemoPhase({
        activeVisas: initialVisas,
        toolCalls: [toolCall()],
      }),
    ).toBe("blocked");
  });

  it("moves to visa granted after a denied attempt and a granted invoice visa", () => {
    expect(
      getDemoPhase({
        activeVisas: invoiceExportVisas,
        toolCalls: [toolCall()],
      }),
    ).toBe("visaGranted");
  });

  it("moves to complete after the invoice export succeeds", () => {
    expect(
      getDemoPhase({
        activeVisas: invoiceExportVisas,
        toolCalls: [toolCall({ decision: "allowed", agentVisaAllows: true })],
      }),
    ).toBe("complete");
  });
});

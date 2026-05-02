import { describe, expect, it } from "vitest";

import {
  getAuditLogsIntegrationStatus,
  getFgaIntegrationStatus,
} from "./integration-status";
import type { AuditEvent } from "./types";

function auditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "audit_1",
    occurredAt: "2026-05-02T18:00:00.000Z",
    actorType: "agent",
    actorId: "finance-agent",
    action: "agent.tool_call.denied",
    targetType: "document",
    targetId: "q4-invoices",
    decision: "denied",
    reason: "Denied for test.",
    metadata: {},
    workosStatus: "not_sent",
    workosError: null,
    ...overrides,
  };
}

describe("getFgaIntegrationStatus", () => {
  it("reports not configured when WorkOS env is missing", () => {
    expect(
      getFgaIntegrationStatus({ events: [], configured: false }).state,
    ).toBe("notConfigured");
  });

  it("reports ready when configured but no FGA check has been observed", () => {
    expect(getFgaIntegrationStatus({ events: [], configured: true })).toMatchObject({
      key: "fga",
      state: "ready",
    });
  });

  it("reports connected when audit metadata proves a WorkOS FGA check ran", () => {
    expect(
      getFgaIntegrationStatus({
        configured: true,
        events: [
          auditEvent({
            metadata: {
              humanAccessSource: "workos_fga",
              humanRequiredPermission: "document:export",
            },
          }),
        ],
      }).state,
    ).toBe("connected");
  });
});

describe("getAuditLogsIntegrationStatus", () => {
  it("reports no events before the audit log has entries", () => {
    expect(getAuditLogsIntegrationStatus({ events: [] }).state).toBe(
      "noEventsYet",
    );
  });

  it("reports failing when local audit events cannot be loaded", () => {
    expect(
      getAuditLogsIntegrationStatus({ events: [], loadFailed: true }).state,
    ).toBe("failing");
  });

  it("reports connected when any local event was sent to WorkOS", () => {
    expect(
      getAuditLogsIntegrationStatus({
        events: [
          auditEvent({ workosStatus: "failed" }),
          auditEvent({ id: "audit_2", workosStatus: "sent" }),
        ],
      }).state,
    ).toBe("connected");
  });

  it("reports failing when all observed events failed to send", () => {
    expect(
      getAuditLogsIntegrationStatus({
        events: [auditEvent({ workosStatus: "failed" })],
      }).state,
    ).toBe("failing");
  });

  it("reports ready when local events exist but delivery is pending", () => {
    expect(
      getAuditLogsIntegrationStatus({
        events: [auditEvent({ workosStatus: "not_sent" })],
      }).state,
    ).toBe("ready");
  });
});

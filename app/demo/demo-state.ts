import { AGENT_PERMISSIONS, DEMO_RESOURCE_IDS } from "@/lib/demo-catalog";
import type { AuditEvent, ToolCallResult } from "@/lib/types";

export type DemoStepKey =
  | "signedIn"
  | "missionRun"
  | "exportBlocked"
  | "visaGranted"
  | "exportPrepared"
  | "auditProof";

export type DemoStepState = "complete" | "current" | "pending";

export interface DemoStep {
  key: DemoStepKey;
  label: string;
  state: DemoStepState;
  detail: string;
}

export interface PreparedExport {
  filename: string;
  permission: string;
  detail: string;
}

export interface PresentedAuditEvent {
  title: string;
  detail: string;
  status: string;
}

export type DemoPhase = "ready" | "blocked" | "visaGranted" | "complete";

interface DemoStepInput {
  signedInEmail: string;
  toolCalls: ToolCallResult[];
  activeVisas: string[];
  auditEvents: AuditEvent[];
}

const INVOICE_RESOURCE_ID = DEMO_RESOURCE_IDS.q4Invoices;
const INVOICE_EXPORT_PERMISSION = AGENT_PERMISSIONS.invoiceExport;

function hasInvoiceExportWithDecision(
  toolCalls: ToolCallResult[],
  decision: ToolCallResult["decision"],
) {
  return toolCalls.some(
    (toolCall) =>
      toolCall.tool === "export_csv" &&
      toolCall.resourceId === INVOICE_RESOURCE_ID &&
      toolCall.decision === decision,
  );
}

function hasSentInvoiceExportAuditProof(auditEvents: AuditEvent[]) {
  return Boolean(getInvoiceExportAuditProof(auditEvents));
}

export function getPreparedExport(
  toolCalls: ToolCallResult[],
): PreparedExport | null {
  const invoiceExport = toolCalls.find(
    (toolCall) =>
      toolCall.tool === "export_csv" &&
      toolCall.resourceId === INVOICE_RESOURCE_ID &&
      toolCall.decision === "allowed",
  );

  if (!invoiceExport) {
    return null;
  }

  return {
    filename: invoiceExport.resourceName,
    permission: INVOICE_EXPORT_PERMISSION,
    detail: "Demo artifact only; no real file was created.",
  };
}

export function getInvoiceExportCheck(toolCalls: ToolCallResult[]) {
  return (
    toolCalls.find(
      (toolCall) =>
        toolCall.tool === "export_csv" &&
        toolCall.resourceId === INVOICE_RESOURCE_ID &&
        toolCall.decision === "allowed",
    ) ??
    toolCalls.find(
      (toolCall) =>
        toolCall.tool === "export_csv" &&
        toolCall.resourceId === INVOICE_RESOURCE_ID,
    )
  );
}

export function getRecentAuditEvents(events: AuditEvent[], limit = 3) {
  return [...events]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, limit);
}

export function getInvoiceExportAuditProof(events: AuditEvent[]) {
  return getRecentAuditEvents(events, events.length).find(
    (event) =>
      event.workosStatus === "sent" &&
      event.decision === "allowed" &&
      event.action === "agent.tool_call.allowed" &&
      event.targetId === INVOICE_RESOURCE_ID &&
      event.metadata.tool === "export_csv",
  );
}

function stringMetadata(event: AuditEvent, key: string): string | undefined {
  const value = event.metadata[key];

  return typeof value === "string" ? value : undefined;
}

function titleCaseDecision(decision: AuditEvent["decision"]) {
  if (decision === "allowed") {
    return "Allowed";
  }

  if (decision === "denied") {
    return "Denied";
  }

  return "Recorded";
}

export function presentAuditEvent(event: AuditEvent): PresentedAuditEvent {
  const tool = stringMetadata(event, "tool");
  const resourceName = stringMetadata(event, "resourceName") ?? event.targetId;
  const requiredPermission = stringMetadata(event, "requiredPermission");
  const decision = titleCaseDecision(event.decision);

  if (tool) {
    return {
      title: `${decision} ${tool} on ${resourceName}`,
      detail: requiredPermission
        ? `${event.action}; required ${requiredPermission}`
        : event.action,
      status: event.decision ?? event.workosStatus,
    };
  }

  return {
    title: event.action,
    detail: `${event.actorType}:${event.actorId} -> ${event.targetType}:${event.targetId}`,
    status: event.decision ?? event.workosStatus,
  };
}

export function getDemoPhase({
  activeVisas,
  toolCalls,
}: {
  activeVisas: string[];
  toolCalls: ToolCallResult[];
}): DemoPhase {
  const preparedExport = getPreparedExport(toolCalls);

  if (preparedExport) {
    return "complete";
  }

  const invoiceExportCheck = getInvoiceExportCheck(toolCalls);

  if (!invoiceExportCheck) {
    return "ready";
  }

  if (activeVisas.includes(INVOICE_EXPORT_PERMISSION)) {
    return "visaGranted";
  }

  return "blocked";
}

export function getDemoSteps({
  signedInEmail,
  toolCalls,
  activeVisas,
  auditEvents,
}: DemoStepInput): DemoStep[] {
  const signedIn = Boolean(signedInEmail);
  const missionRun = toolCalls.length > 0;
  const scopeGranted = activeVisas.includes(INVOICE_EXPORT_PERMISSION);
  const exportPrepared = Boolean(getPreparedExport(toolCalls));
  const exportBlocked =
    exportPrepared || hasInvoiceExportWithDecision(toolCalls, "denied");
  const auditProof =
    exportPrepared && hasSentInvoiceExportAuditProof(auditEvents);

  const completed = [
    signedIn,
    missionRun,
    exportBlocked,
    scopeGranted,
    exportPrepared,
    auditProof,
  ];
  const currentIndex = completed.findIndex((isComplete) => !isComplete);

  function state(index: number): DemoStepState {
    if (completed[index]) {
      return "complete";
    }

    return currentIndex === index ? "current" : "pending";
  }

  return [
    {
      key: "signedIn",
      label: "Signed in",
      state: state(0),
      detail: signedIn ? signedInEmail : "AuthKit session required",
    },
    {
      key: "missionRun",
      label: "Test access",
      state: state(1),
      detail: missionRun ? "Access check completed" : "Start the check",
    },
    {
      key: "exportBlocked",
      label: "Export blocked",
      state: state(2),
      detail: exportBlocked
        ? "Invoice export denied before scope"
        : `Agent lacks ${INVOICE_EXPORT_PERMISSION}`,
    },
    {
      key: "visaGranted",
      label: "Scope granted",
      state: state(3),
      detail: scopeGranted
        ? `${INVOICE_EXPORT_PERMISSION} active`
        : "Grant narrow access",
    },
    {
      key: "exportPrepared",
      label: "Run again",
      state: state(4),
      detail: exportPrepared
        ? "Invoice export prepared"
        : "Retry check with scope",
    },
    {
      key: "auditProof",
      label: "Audit proof",
      state: state(5),
      detail: auditProof ? "WorkOS Audit Logs sent" : "Verify the trail",
    },
  ];
}

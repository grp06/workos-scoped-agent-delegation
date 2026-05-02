import {
  AGENT_PERMISSIONS,
  DEMO_RESOURCE_IDS,
} from "@/lib/demo-catalog";
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

export function getDemoSteps({
  signedInEmail,
  toolCalls,
  activeVisas,
  auditEvents,
}: DemoStepInput): DemoStep[] {
  const signedIn = Boolean(signedInEmail);
  const missionRun = toolCalls.length > 0;
  const visaGranted = activeVisas.includes(INVOICE_EXPORT_PERMISSION);
  const exportPrepared = Boolean(getPreparedExport(toolCalls));
  const exportBlocked =
    exportPrepared || hasInvoiceExportWithDecision(toolCalls, "denied");
  const auditProof =
    auditEvents.length > 0 &&
    auditEvents.some((event) => event.workosStatus === "sent");

  const completed = [
    signedIn,
    missionRun,
    exportBlocked,
    visaGranted,
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
      label: "Run mission",
      state: state(1),
      detail: missionRun ? "Finance tool calls completed" : "Start the agent",
    },
    {
      key: "exportBlocked",
      label: "Export blocked",
      state: state(2),
      detail: exportBlocked
        ? "Invoice export denied before visa"
        : "Agent lacks invoice.export",
    },
    {
      key: "visaGranted",
      label: "Visa granted",
      state: state(3),
      detail: visaGranted ? "invoice.export active" : "Grant narrow access",
    },
    {
      key: "exportPrepared",
      label: "Run again",
      state: state(4),
      detail: exportPrepared
        ? "Invoice export prepared"
        : "Retry mission with visa",
    },
    {
      key: "auditProof",
      label: "Audit proof",
      state: state(5),
      detail: auditProof ? "WorkOS Audit Logs sent" : "Verify the trail",
    },
  ];
}

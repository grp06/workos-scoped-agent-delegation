import type { ToolAction } from "./types";

export const DOCUMENT_RESOURCE_TYPE = "document";

export const WORKOS_DOCUMENT_PERMISSION_PREFIX = "document:";

export const WORKOS_DOCUMENT_PERMISSIONS = {
  read: "document:read",
  summarize: "document:summarize",
  export: "document:export",
} as const;

type WorkosDocumentPermission =
  (typeof WORKOS_DOCUMENT_PERMISSIONS)[keyof typeof WORKOS_DOCUMENT_PERMISSIONS];

export const WORKOS_DOCUMENT_PERMISSION_DEFINITIONS = [
  {
    slug: WORKOS_DOCUMENT_PERMISSIONS.read,
    name: "Read document",
    description: "Read a document in the finance data room.",
  },
  {
    slug: WORKOS_DOCUMENT_PERMISSIONS.summarize,
    name: "Summarize document",
    description: "Summarize a document in the finance data room.",
  },
  {
    slug: WORKOS_DOCUMENT_PERMISSIONS.export,
    name: "Export document",
    description: "Export a document from the finance data room.",
  },
] as const;

export const TOOL_ACTIONS = [
  "search_docs",
  "summarize_document",
  "export_csv",
] as const satisfies readonly ToolAction[];

export function isToolAction(value: string): value is ToolAction {
  return TOOL_ACTIONS.some((action) => action === value);
}

export const AGENT_PERMISSIONS = {
  invoiceRead: "invoice.read",
  invoiceSummarize: "invoice.summarize",
  invoiceExport: "invoice.export",
  payrollRead: "payroll.read",
  payrollExport: "payroll.export",
  boardRead: "board.read",
  contractRead: "contract.read",
  contractExport: "contract.export",
} as const;

export const DEMO_RESOURCE_IDS = {
  q4Invoices: "q4-invoices",
  payroll: "payroll",
  boardDeck: "board-deck",
  customerContracts: "customer-contracts",
} as const;

export const FINANCE_DOCUMENT_RESOURCE_IDS = [
  DEMO_RESOURCE_IDS.q4Invoices,
  DEMO_RESOURCE_IDS.payroll,
] as const;

function assertNever(value: never): never {
  throw new Error(`Unhandled tool action: ${String(value)}`);
}

export function getWorkosPermissionForToolAction(
  action: ToolAction,
): WorkosDocumentPermission {
  switch (action) {
    case "search_docs":
      return WORKOS_DOCUMENT_PERMISSIONS.read;
    case "summarize_document":
      return WORKOS_DOCUMENT_PERMISSIONS.summarize;
    case "export_csv":
      return WORKOS_DOCUMENT_PERMISSIONS.export;
    default:
      return assertNever(action);
  }
}

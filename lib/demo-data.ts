import {
  AGENT_PERMISSIONS,
  DEMO_RESOURCE_IDS,
  DOCUMENT_RESOURCE_TYPE,
} from "./demo-catalog";

export const DEMO_USER_ID = "alice";
export const FINANCE_AGENT_ID = "finance-agent";
export const INVOICE_EXPORT_PERMISSION = AGENT_PERMISSIONS.invoiceExport;

export const demoUserSeed = {
  id: DEMO_USER_ID,
  email: "alice@example.com",
  name: "Alice Chen",
  role: "finance_admin",
} as const;

export const financeAgentSeed = {
  id: FINANCE_AGENT_ID,
  slug: FINANCE_AGENT_ID,
  name: "Finance Agent",
  description: "Agent delegated to help with invoice close.",
} as const;

export const resourceSeeds = [
  {
    id: DEMO_RESOURCE_IDS.q4Invoices,
    name: "q4-invoices.csv",
    resourceType: DOCUMENT_RESOURCE_TYPE,
    category: "invoice",
    requiredReadPermission: AGENT_PERMISSIONS.invoiceRead,
    requiredExportPermission: AGENT_PERMISSIONS.invoiceExport,
  },
  {
    id: DEMO_RESOURCE_IDS.payroll,
    name: "payroll.xlsx",
    resourceType: DOCUMENT_RESOURCE_TYPE,
    category: "payroll",
    requiredReadPermission: AGENT_PERMISSIONS.payrollRead,
    requiredExportPermission: AGENT_PERMISSIONS.payrollExport,
  },
  {
    id: DEMO_RESOURCE_IDS.boardDeck,
    name: "board-deck.pdf",
    resourceType: DOCUMENT_RESOURCE_TYPE,
    category: "board",
    requiredReadPermission: AGENT_PERMISSIONS.boardRead,
    requiredExportPermission: null,
  },
  {
    id: DEMO_RESOURCE_IDS.customerContracts,
    name: "customer-contracts.pdf",
    resourceType: DOCUMENT_RESOURCE_TYPE,
    category: "contract",
    requiredReadPermission: AGENT_PERMISSIONS.contractRead,
    requiredExportPermission: AGENT_PERMISSIONS.contractExport,
  },
] as const;

export const initialVisaPermissions = [
  AGENT_PERMISSIONS.invoiceRead,
  AGENT_PERMISSIONS.invoiceSummarize,
] as const;

export function visaId(agentId: string, permission: string) {
  return `visa_${agentId}_${permission}`.replaceAll(".", "_");
}

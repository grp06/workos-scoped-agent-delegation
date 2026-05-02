export const DEMO_USER_ID = "alice";
export const FINANCE_AGENT_ID = "finance-agent";
export const INVOICE_EXPORT_PERMISSION = "invoice.export";

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
    id: "q4-invoices",
    name: "q4-invoices.csv",
    resourceType: "document",
    category: "invoice",
    requiredReadPermission: "invoice.read",
    requiredExportPermission: INVOICE_EXPORT_PERMISSION,
  },
  {
    id: "payroll",
    name: "payroll.xlsx",
    resourceType: "document",
    category: "payroll",
    requiredReadPermission: "payroll.read",
    requiredExportPermission: "payroll.export",
  },
  {
    id: "board-deck",
    name: "board-deck.pdf",
    resourceType: "document",
    category: "board",
    requiredReadPermission: "board.read",
    requiredExportPermission: null,
  },
  {
    id: "customer-contracts",
    name: "customer-contracts.pdf",
    resourceType: "document",
    category: "contract",
    requiredReadPermission: "contract.read",
    requiredExportPermission: "contract.export",
  },
] as const;

export const initialVisaPermissions = [
  "invoice.read",
  "invoice.summarize",
] as const;

export function visaId(agentId: string, permission: string) {
  return `visa_${agentId}_${permission}`.replaceAll(".", "_");
}

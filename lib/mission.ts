import { checkAccess } from "@/lib/authz";
import { recordAndEmitAuditEvent } from "@/lib/audit";
import {
  DEMO_RESOURCE_IDS,
  DOCUMENT_RESOURCE_TYPE,
} from "@/lib/demo-catalog";
import { FINANCE_AGENT_ID } from "@/lib/demo-data";
import type { CheckInput, ToolAction, ToolCallResult } from "@/lib/types";

const missionToolCalls: Array<{
  tool: ToolAction;
  resourceId: string;
  resourceName: string;
}> = [
  {
    tool: "search_docs",
    resourceId: DEMO_RESOURCE_IDS.q4Invoices,
    resourceName: "q4-invoices.csv",
  },
  {
    tool: "summarize_document",
    resourceId: DEMO_RESOURCE_IDS.q4Invoices,
    resourceName: "q4-invoices.csv",
  },
  {
    tool: "export_csv",
    resourceId: DEMO_RESOURCE_IDS.q4Invoices,
    resourceName: "q4-invoices.csv",
  },
  {
    tool: "export_csv",
    resourceId: DEMO_RESOURCE_IDS.payroll,
    resourceName: "payroll.xlsx",
  },
];

export async function runFinanceMission(
  human: CheckInput["human"],
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const toolCall of missionToolCalls) {
    const check = await checkAccess({
      human,
      agentId: FINANCE_AGENT_ID,
      action: toolCall.tool,
      resourceId: toolCall.resourceId,
    });

    await recordAndEmitAuditEvent({
      actorType: "agent",
      actorId: FINANCE_AGENT_ID,
      action:
        check.decision === "allowed"
          ? "agent.tool_call.allowed"
          : "agent.tool_call.denied",
      targetType: DOCUMENT_RESOURCE_TYPE,
      targetId: toolCall.resourceId,
      decision: check.decision,
      reason: check.reason,
      metadata: {
        tool: toolCall.tool,
        resourceName: toolCall.resourceName,
        humanHasAccess: check.humanHasAccess,
        humanAccessSource: check.humanAccessSource,
        humanRequiredPermission: check.humanRequiredPermission,
        agentVisaAllows: check.agentVisaAllows,
        ...(check.requiredPermission
          ? { requiredPermission: check.requiredPermission }
          : {}),
      },
    });

    results.push({
      ...check,
      tool: toolCall.tool,
      resourceId: toolCall.resourceId,
      resourceName: toolCall.resourceName,
    });
  }

  return results;
}

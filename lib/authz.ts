import { sql } from "@/lib/db";
import { AGENT_PERMISSIONS } from "@/lib/demo-catalog";
import { checkWorkosHumanAccess } from "@/lib/human-access";
import type {
  Agent,
  CheckInput,
  CheckResult,
  Resource,
  ToolAction,
} from "@/lib/types";
import type { HumanAccessResult } from "@/lib/human-access";

interface EvaluateAccessInput {
  agent: Agent;
  action: ToolAction;
  resource: Resource;
  humanAccess: HumanAccessResult;
  agentVisaAllows: boolean;
}

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface ResourceRow {
  id: string;
  name: string;
  resource_type: string;
  category: string;
  required_read_permission: string;
  required_export_permission: string | null;
}

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
  };
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    name: row.name,
    resourceType: row.resource_type,
    category: row.category,
    requiredReadPermission: row.required_read_permission,
    requiredExportPermission: row.required_export_permission,
  };
}

async function loadAgent(id: string): Promise<Agent> {
  const rows = (await sql`
    select id, slug, name, description
    from agents
    where id = ${id}
    limit 1
  `) as AgentRow[];

  if (!rows[0]) {
    throw new Error(`No agent found for id ${id}.`);
  }

  return mapAgent(rows[0]);
}

async function loadResource(id: string): Promise<Resource> {
  const rows = (await sql`
    select
      id,
      name,
      resource_type,
      category,
      required_read_permission,
      required_export_permission
    from resources
    where id = ${id}
    limit 1
  `) as ResourceRow[];

  if (!rows[0]) {
    throw new Error(`No resource found for id ${id}.`);
  }

  return mapResource(rows[0]);
}

export function getRequiredPermission(
  action: ToolAction,
  resource: Resource,
): string | null {
  if (action === "search_docs") {
    return resource.requiredReadPermission;
  }

  if (action === "summarize_document") {
    return resource.category === "invoice"
      ? AGENT_PERMISSIONS.invoiceSummarize
      : resource.requiredReadPermission;
  }

  return resource.requiredExportPermission ?? null;
}

export async function checkAgentVisa(
  agentId: string,
  requiredPermission: string | null,
) {
  if (!requiredPermission) {
    return false;
  }

  const rows = await sql`
    select 1 as active
    from agent_visas
    where agent_id = ${agentId}
      and permission = ${requiredPermission}
      and expires_at > now()
    limit 1
  `;

  return rows.length > 0;
}

export function evaluateAccess({
  agent,
  action,
  resource,
  humanAccess,
  agentVisaAllows,
}: EvaluateAccessInput): CheckResult {
  const requiredPermission = getRequiredPermission(action, resource);
  const effectiveVisaAllows = Boolean(requiredPermission && agentVisaAllows);

  if (!requiredPermission) {
    return {
      humanHasAccess: humanAccess.allowed,
      humanAccessSource: humanAccess.source,
      humanRequiredPermission: humanAccess.requiredPermission,
      agentVisaAllows: false,
      decision: "denied",
      requiredPermission,
      reason: `${resource.name} has no export permission configured for this demo.`,
    };
  }

  if (!humanAccess.allowed) {
    return {
      humanHasAccess: false,
      humanAccessSource: humanAccess.source,
      humanRequiredPermission: humanAccess.requiredPermission,
      agentVisaAllows: effectiveVisaAllows,
      decision: "denied",
      requiredPermission,
      reason: humanAccess.reason,
    };
  }

  if (!effectiveVisaAllows) {
    return {
      humanHasAccess: true,
      humanAccessSource: humanAccess.source,
      humanRequiredPermission: humanAccess.requiredPermission,
      agentVisaAllows: false,
      decision: "denied",
      requiredPermission,
      reason: `${humanAccess.reason}, but ${agent.name} lacks ${requiredPermission}.`,
    };
  }

  return {
    humanHasAccess: true,
    humanAccessSource: humanAccess.source,
    humanRequiredPermission: humanAccess.requiredPermission,
    agentVisaAllows: true,
    decision: "allowed",
    requiredPermission,
    reason: `${humanAccess.reason} and ${agent.name} has ${requiredPermission}.`,
  };
}

export async function checkAccess(input: CheckInput): Promise<CheckResult> {
  const [agent, resource] = await Promise.all([
    loadAgent(input.agentId),
    loadResource(input.resourceId),
  ]);
  const requiredPermission = getRequiredPermission(input.action, resource);
  const [humanAccess, agentVisaAllows] = await Promise.all([
    checkWorkosHumanAccess(input.human, input.action, resource),
    checkAgentVisa(agent.id, requiredPermission),
  ]);

  return evaluateAccess({
    agent,
    action: input.action,
    resource,
    humanAccess,
    agentVisaAllows,
  });
}

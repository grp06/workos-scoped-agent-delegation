export type Decision = "allowed" | "denied";
export type ToolAction = "search_docs" | "summarize_document" | "export_csv";
export type WorkosStatus = "not_sent" | "sent" | "failed";
export type AuditMetadata = Record<string, string | number | boolean>;
export type IntegrationStatusState =
  | "connected"
  | "ready"
  | "notConfigured"
  | "failing"
  | "noEventsYet";

export interface IntegrationStatus {
  key: "authkit" | "database" | "fga" | "auditLogs";
  label: string;
  state: IntegrationStatusState;
  detail: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface Resource {
  id: string;
  name: string;
  resourceType: string;
  category: string;
  requiredReadPermission: string;
  requiredExportPermission?: string | null;
}

export interface CheckInput {
  human: {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    organizationId?: string;
  };
  agentId: string;
  action: ToolAction;
  resourceId: string;
}

export interface CheckResult {
  humanHasAccess: boolean;
  humanAccessSource: "workos_fga";
  humanRequiredPermission: string;
  agentVisaAllows: boolean;
  decision: Decision;
  reason: string;
  requiredPermission: string | null;
}

export interface ToolCallResult extends CheckResult {
  tool: ToolAction;
  resourceId: string;
  resourceName: string;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  decision: Decision | null;
  reason: string | null;
  metadata: AuditMetadata;
  workosStatus: WorkosStatus;
  workosError: string | null;
}

export interface RecordAuditEventInput {
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  decision?: Decision;
  reason?: string;
  metadata?: AuditMetadata;
}

import { randomUUID } from "node:crypto";

import { WorkOS } from "@workos-inc/node";

import { sql } from "@/lib/db";
import type {
  AuditEvent,
  AuditMetadata,
  RecordAuditEventInput,
  WorkosStatus,
} from "@/lib/types";

interface AuditEventRow {
  id: string;
  occurred_at: string | Date;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  decision: "allowed" | "denied" | null;
  reason: string | null;
  metadata: unknown;
  workos_status: WorkosStatus;
  workos_error: string | null;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function toAuditMetadata(value: unknown): AuditMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | number | boolean] =>
        typeof entry[1] === "string" ||
        typeof entry[1] === "number" ||
        typeof entry[1] === "boolean",
    ),
  );
}

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    occurredAt:
      row.occurred_at instanceof Date
        ? row.occurred_at.toISOString()
        : row.occurred_at,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    decision: row.decision,
    reason: row.reason,
    metadata: toAuditMetadata(row.metadata),
    workosStatus: row.workos_status,
    workosError: row.workos_error,
  };
}

async function updateWorkosStatus(
  eventId: string,
  status: WorkosStatus,
  error: string | null,
) {
  const rows = (await sql`
    update audit_events
    set workos_status = ${status}, workos_error = ${error}
    where id = ${eventId}
    returning
      id,
      occurred_at,
      actor_type,
      actor_id,
      action,
      target_type,
      target_id,
      decision,
      reason,
      metadata,
      workos_status,
      workos_error
  `) as AuditEventRow[];

  if (!rows[0]) {
    throw new Error(`No audit event found for id ${eventId}.`);
  }

  return mapAuditEvent(rows[0]);
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  const metadata = input.metadata ?? {};
  const rows = (await sql`
    insert into audit_events (
      id,
      actor_type,
      actor_id,
      action,
      target_type,
      target_id,
      decision,
      reason,
      metadata
    )
    values (
      ${`audit_${randomUUID()}`},
      ${input.actorType},
      ${input.actorId},
      ${input.action},
      ${input.targetType},
      ${input.targetId},
      ${input.decision ?? null},
      ${input.reason ?? null},
      ${JSON.stringify(metadata)}::jsonb
    )
    returning
      id,
      occurred_at,
      actor_type,
      actor_id,
      action,
      target_type,
      target_id,
      decision,
      reason,
      metadata,
      workos_status,
      workos_error
  `) as AuditEventRow[];

  return mapAuditEvent(rows[0]);
}

export async function emitWorkosAuditEvent(localEvent: AuditEvent) {
  try {
    const workos = new WorkOS(requireEnv("WORKOS_API_KEY"));
    const organizationId = requireEnv("WORKOS_ORGANIZATION_ID");
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    await workos.auditLogs.createEvent(
      organizationId,
      {
        action: localEvent.action,
        occurredAt: new Date(localEvent.occurredAt),
        version: 1,
        actor: {
          type: localEvent.actorType,
          id: localEvent.actorId,
          name: localEvent.actorId,
          metadata: {},
        },
        targets: [
          {
            type: localEvent.targetType,
            id: localEvent.targetId,
            name: localEvent.targetId,
          },
        ],
        context: {
          location: appUrl,
          userAgent: "agent-passport-control-demo",
        },
        metadata: {
          ...localEvent.metadata,
          ...(localEvent.decision ? { decision: localEvent.decision } : {}),
          ...(localEvent.reason ? { reason: localEvent.reason } : {}),
        },
      },
      { idempotencyKey: localEvent.id },
    );

    return await updateWorkosStatus(localEvent.id, "sent", null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return await updateWorkosStatus(localEvent.id, "failed", message);
  }
}

export async function recordAndEmitAuditEvent(input: RecordAuditEventInput) {
  const localEvent = await recordAuditEvent(input);
  return await emitWorkosAuditEvent(localEvent);
}

export async function listAuditEvents() {
  const rows = (await sql`
    select
      id,
      occurred_at,
      actor_type,
      actor_id,
      action,
      target_type,
      target_id,
      decision,
      reason,
      metadata,
      workos_status,
      workos_error
    from audit_events
    order by occurred_at asc
  `) as AuditEventRow[];

  return rows.map(mapAuditEvent);
}

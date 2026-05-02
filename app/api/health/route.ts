import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

import { listAuditEvents } from "@/lib/audit";
import { sql } from "@/lib/db";
import {
  getAuditLogsIntegrationStatus,
  getFgaIntegrationStatus,
} from "@/lib/integration-status";
import type { AuditEvent, IntegrationStatus } from "@/lib/types";

function envConfigured(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]));
}

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const statuses: IntegrationStatus[] = [
    {
      key: "authkit",
      label: "WorkOS AuthKit",
      state: "connected",
      detail: `Signed in as ${user.email}.`,
    },
  ];

  let events: AuditEvent[] = [];
  let auditEventsLoadFailed = false;

  try {
    await sql`select 1 as ok`;
    statuses.push({
      key: "database",
      label: "Database",
      state: "connected",
      detail: "Postgres query succeeded.",
    });
  } catch {
    statuses.push({
      key: "database",
      label: "Database",
      state: "failing",
      detail: "Postgres query failed.",
    });
  }

  try {
    events = await listAuditEvents();
  } catch {
    auditEventsLoadFailed = true;
  }

  statuses.push(
    getFgaIntegrationStatus({
      events,
      configured: envConfigured("WORKOS_API_KEY", "WORKOS_ORGANIZATION_ID"),
    }),
    getAuditLogsIntegrationStatus({
      events,
      loadFailed: auditEventsLoadFailed,
    }),
  );

  return NextResponse.json({
    ok: true,
    service: "agent-passport-control",
    statuses,
  });
}

import { NextResponse } from "next/server";

import { recordAndEmitAuditEvent } from "@/lib/audit";
import {
  DEMO_USER_ID,
  FINANCE_AGENT_ID,
  INVOICE_EXPORT_PERMISSION,
  visaId,
} from "@/lib/demo-data";
import { sql } from "@/lib/db";

export async function POST() {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await sql`
    insert into agent_visas (id, agent_id, permission, expires_at)
    values (
      ${visaId(FINANCE_AGENT_ID, INVOICE_EXPORT_PERMISSION)},
      ${FINANCE_AGENT_ID},
      ${INVOICE_EXPORT_PERMISSION},
      ${expiresAt}
    )
    on conflict (id) do update set
      permission = excluded.permission,
      expires_at = excluded.expires_at
  `;

  await recordAndEmitAuditEvent({
    actorType: "user",
    actorId: DEMO_USER_ID,
    action: "agent.visa.granted",
    targetType: "agent",
    targetId: FINANCE_AGENT_ID,
    metadata: {
      grantedPermission: INVOICE_EXPORT_PERMISSION,
      expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    agentId: FINANCE_AGENT_ID,
    grantedPermission: INVOICE_EXPORT_PERMISSION,
    expiresAt,
  });
}

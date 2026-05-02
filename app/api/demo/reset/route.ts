import { NextResponse } from "next/server";

import { recordAndEmitAuditEvent } from "@/lib/audit";
import {
  DEMO_USER_ID,
  FINANCE_AGENT_ID,
  initialVisaPermissions,
  visaId,
} from "@/lib/demo-data";
import { sql } from "@/lib/db";

export async function POST() {
  await sql.transaction((tx) => [
    tx`delete from audit_events`,
    tx`delete from agent_visas where agent_id = ${FINANCE_AGENT_ID}`,
    ...initialVisaPermissions.map(
      (permission) => tx`
        insert into agent_visas (id, agent_id, permission, expires_at)
        values (
          ${visaId(FINANCE_AGENT_ID, permission)},
          ${FINANCE_AGENT_ID},
          ${permission},
          now() + interval '10 minutes'
        )
        on conflict (id) do update set
          permission = excluded.permission,
          expires_at = excluded.expires_at
      `,
    ),
  ]);

  await recordAndEmitAuditEvent({
    actorType: "user",
    actorId: DEMO_USER_ID,
    action: "demo.reset",
    targetType: "demo",
    targetId: "scoped-agent-delegation",
    metadata: {
      agentId: FINANCE_AGENT_ID,
      restoredVisas: initialVisaPermissions.join(","),
    },
  });

  return NextResponse.json({ ok: true });
}

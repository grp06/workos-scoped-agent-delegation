import { sql } from "@/lib/db";

interface VisaRow {
  permission: string;
}

export async function listActiveVisaPermissions(agentId: string) {
  const rows = (await sql`
    select permission
    from agent_visas
    where agent_id = ${agentId}
      and expires_at > now()
    order by permission asc
  `) as VisaRow[];

  return rows.map((row) => row.permission);
}

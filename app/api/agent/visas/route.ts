import { NextResponse } from "next/server";

import { FINANCE_AGENT_ID } from "@/lib/demo-data";
import { listActiveVisaPermissions } from "@/lib/visas";

export async function GET() {
  const permissions = await listActiveVisaPermissions(FINANCE_AGENT_ID);

  return NextResponse.json({
    agentId: FINANCE_AGENT_ID,
    permissions,
  });
}

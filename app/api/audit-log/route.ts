import { NextResponse } from "next/server";

import { listAuditEvents } from "@/lib/audit";

export async function GET() {
  const events = await listAuditEvents();

  return NextResponse.json({ events });
}

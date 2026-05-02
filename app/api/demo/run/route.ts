import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

import { runFinanceMission } from "@/lib/mission";

export async function POST() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  const toolCalls = await runFinanceMission({ user, organizationId });

  return NextResponse.json({ toolCalls });
}

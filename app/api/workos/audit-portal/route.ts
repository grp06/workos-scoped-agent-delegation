import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

import {
  createAuditLogsPortalLink,
  resolveWorkosOrganizationId,
} from "@/lib/workos-proof";

export async function POST() {
  const { organizationId } = await withAuth({ ensureSignedIn: true });

  try {
    const url = await createAuditLogsPortalLink({
      organizationId: resolveWorkosOrganizationId(organizationId),
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to create WorkOS audit portal link:", error);

    return NextResponse.json(
      {
        error:
          "Could not create a WorkOS Audit Logs portal link for this organization.",
      },
      { status: 502 },
    );
  }
}

import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { checkAccess } from "@/lib/authz";
import { isToolAction } from "@/lib/demo-catalog";
import type { CheckInput } from "@/lib/types";

type CheckRequestInput = Omit<CheckInput, "human">;

function isCheckInput(value: unknown): value is CheckRequestInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CheckRequestInput>;

  return (
    typeof candidate.agentId === "string" &&
    typeof candidate.resourceId === "string" &&
    typeof candidate.action === "string" &&
    isToolAction(candidate.action)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  if (!isCheckInput(body)) {
    return NextResponse.json(
      { error: "Invalid authorization check request." },
      { status: 400 },
    );
  }

  const result = await checkAccess({
    ...body,
    human: { user, organizationId },
  });

  return NextResponse.json(result);
}

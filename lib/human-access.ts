import type { User } from "@workos-inc/node";

import {
  DOCUMENT_RESOURCE_TYPE,
  getWorkosPermissionForToolAction,
} from "@/lib/demo-catalog";
import type { Resource, ToolAction } from "@/lib/types";
import { getWorkos, requireEnv } from "@/lib/workos";

export interface AuthenticatedHuman {
  user: Pick<User, "id" | "email" | "firstName" | "lastName">;
  organizationId?: string;
}

export interface HumanAccessResult {
  allowed: boolean;
  source: "workos_fga";
  requiredPermission: string;
  reason: string;
}

const membershipCache = new Map<string, string>();

export function getHumanPermission(action: ToolAction) {
  return getWorkosPermissionForToolAction(action);
}

export function getHumanDisplayName(user: AuthenticatedHuman["user"]) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email;
}

async function getOrganizationMembershipId(human: AuthenticatedHuman) {
  const organizationId = human.organizationId ?? requireEnv("WORKOS_ORGANIZATION_ID");
  const cacheKey = `${organizationId}:${human.user.id}`;
  const cached = membershipCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const memberships = await getWorkos().userManagement.listOrganizationMemberships({
    organizationId,
    userId: human.user.id,
    statuses: ["active"],
    limit: 1,
  });
  const membership = memberships.data[0];

  if (!membership) {
    throw new Error(
      `No active WorkOS organization membership found for ${human.user.email} in ${organizationId}.`,
    );
  }

  membershipCache.set(cacheKey, membership.id);
  return membership.id;
}

export async function checkWorkosHumanAccess(
  human: AuthenticatedHuman,
  action: ToolAction,
  resource: Resource,
): Promise<HumanAccessResult> {
  const requiredPermission = getHumanPermission(action);
  const humanName = getHumanDisplayName(human.user);

  try {
    const organizationMembershipId = await getOrganizationMembershipId(human);
    const result = await getWorkos().authorization.check({
      organizationMembershipId,
      permissionSlug: requiredPermission,
      resourceExternalId: resource.id,
      resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
    });

    if (!result.authorized) {
      return {
        allowed: false,
        source: "workos_fga",
        requiredPermission,
        reason: `WorkOS FGA says ${humanName} lacks ${requiredPermission} on ${resource.name}.`,
      };
    }

    return {
      allowed: true,
      source: "workos_fga",
      requiredPermission,
      reason: `WorkOS FGA allows ${humanName} to use ${requiredPermission} on ${resource.name}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      allowed: false,
      source: "workos_fga",
      requiredPermission,
      reason: `WorkOS FGA check failed closed for ${humanName}: ${message}`,
    };
  }
}

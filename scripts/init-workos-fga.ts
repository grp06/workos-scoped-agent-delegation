import { loadEnvConfig } from "@next/env";
import { WorkOS } from "@workos-inc/node";

import {
  DOCUMENT_RESOURCE_TYPE,
  FINANCE_DOCUMENT_RESOURCE_IDS,
  WORKOS_DOCUMENT_PERMISSION_DEFINITIONS,
} from "../lib/demo-catalog";
import { resourceSeeds } from "../lib/demo-data";

loadEnvConfig(process.cwd());

const FINANCE_ADMIN_ROLE = "org-finance-admin";
const FINANCE_DOCUMENT_IDS = new Set<string>(FINANCE_DOCUMENT_RESOURCE_IDS);

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function isMissing(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "NotFoundException" || error.message.includes("404"))
  );
}

function isConflict(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "ConflictException" || error.message.includes("409"))
  );
}

async function ensurePermission(
  workos: WorkOS,
  permission: (typeof WORKOS_DOCUMENT_PERMISSION_DEFINITIONS)[number],
) {
  try {
    await workos.authorization.getPermission(permission.slug);
    console.log(`Permission exists: ${permission.slug}`);
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }

    await workos.authorization.createPermission({
      slug: permission.slug,
      name: permission.name,
      description: permission.description,
      resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
    });
    console.log(`Created permission: ${permission.slug}`);
  }
}

async function ensureRole(workos: WorkOS, organizationId: string) {
  try {
    await workos.authorization.getOrganizationRole(
      organizationId,
      FINANCE_ADMIN_ROLE,
    );
    console.log(`Role exists: ${FINANCE_ADMIN_ROLE}`);
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }

    await workos.authorization.createOrganizationRole(organizationId, {
      slug: FINANCE_ADMIN_ROLE,
      name: "Finance Admin",
      description: "Can read, summarize, and export finance documents.",
      resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
    });
    console.log(`Created role: ${FINANCE_ADMIN_ROLE}`);
  }

  await workos.authorization.setOrganizationRolePermissions(
    organizationId,
    FINANCE_ADMIN_ROLE,
    {
      permissions: WORKOS_DOCUMENT_PERMISSION_DEFINITIONS.map(
        (permission) => permission.slug,
      ),
    },
  );
  console.log(`Set role permissions: ${FINANCE_ADMIN_ROLE}`);
}

async function ensureResources(workos: WorkOS, organizationId: string) {
  for (const resource of resourceSeeds) {
    const description = `${resource.category} ${resource.resourceType}`;

    try {
      await workos.authorization.getResourceByExternalId({
        organizationId,
        resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
        externalId: resource.id,
      });
      await workos.authorization.updateResourceByExternalId({
        organizationId,
        resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
        externalId: resource.id,
        name: resource.name,
        description,
      });
      console.log(`Updated FGA resource: ${resource.id}`);
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }

      await workos.authorization.createResource({
        organizationId,
        resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
        externalId: resource.id,
        name: resource.name,
        description,
      });
      console.log(`Created FGA resource: ${resource.id}`);
    }
  }
}

async function resolveMembershipId(workos: WorkOS, organizationId: string) {
  const explicitMembershipId = process.env.WORKOS_ORGANIZATION_MEMBERSHIP_ID;

  if (explicitMembershipId) {
    return explicitMembershipId;
  }

  const email = requireEnv("WORKOS_DEMO_USER_EMAIL");
  const users = await workos.userManagement.listUsers({
    email,
    organizationId,
    limit: 1,
  });
  const user = users.data[0];

  if (!user) {
    throw new Error(`No WorkOS user found for ${email} in ${organizationId}.`);
  }

  const memberships = await workos.userManagement.listOrganizationMemberships({
    organizationId,
    userId: user.id,
    statuses: ["active"],
    limit: 1,
  });
  const membership = memberships.data[0];

  if (!membership) {
    throw new Error(
      `No active WorkOS organization membership found for ${email} in ${organizationId}.`,
    );
  }

  return membership.id;
}

async function assignFinanceAccess(
  workos: WorkOS,
  organizationMembershipId: string,
) {
  for (const resource of resourceSeeds) {
    if (!FINANCE_DOCUMENT_IDS.has(resource.id)) {
      continue;
    }

    try {
      await workos.authorization.assignRole({
        organizationMembershipId,
        roleSlug: FINANCE_ADMIN_ROLE,
        resourceExternalId: resource.id,
        resourceTypeSlug: DOCUMENT_RESOURCE_TYPE,
      });
      console.log(`Assigned ${FINANCE_ADMIN_ROLE}: ${resource.id}`);
    } catch (error) {
      if (!isConflict(error)) {
        throw error;
      }

      console.log(`Assignment already exists: ${resource.id}`);
    }
  }
}

async function main() {
  const organizationId = requireEnv("WORKOS_ORGANIZATION_ID");
  const workos = new WorkOS(requireEnv("WORKOS_API_KEY"));

  for (const permission of WORKOS_DOCUMENT_PERMISSION_DEFINITIONS) {
    await ensurePermission(workos, permission);
  }

  await ensureRole(workos, organizationId);
  await ensureResources(workos, organizationId);

  const organizationMembershipId = await resolveMembershipId(
    workos,
    organizationId,
  );
  await assignFinanceAccess(workos, organizationMembershipId);

  console.log("WorkOS FGA initialized.");
}

main().catch((error: unknown) => {
  console.error(error);

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("resource type")
  ) {
    console.error(
      "Create a WorkOS Authorization resource type with slug 'document' before rerunning this script.",
    );
  }

  process.exit(1);
});

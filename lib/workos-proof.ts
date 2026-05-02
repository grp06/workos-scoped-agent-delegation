import { getAppUrl } from "@/lib/app-url";
import { getWorkos, requireEnv } from "@/lib/workos";

export function resolveWorkosOrganizationId(authOrganizationId?: string) {
  return authOrganizationId ?? requireEnv("WORKOS_ORGANIZATION_ID");
}

export async function createAuditLogsPortalLink({
  organizationId,
}: {
  organizationId: string;
}) {
  const { link } = await getWorkos().adminPortal.generateLink({
    organization: organizationId,
    intent: "audit_logs",
    returnUrl: `${getAppUrl()}/demo`,
  });

  return link;
}

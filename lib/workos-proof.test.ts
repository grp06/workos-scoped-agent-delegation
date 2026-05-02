import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAuditLogsPortalLink,
  resolveWorkosOrganizationId,
} from "./workos-proof";

const generateLink = vi.hoisted(() => vi.fn());

vi.mock("@/lib/workos", () => ({
  getWorkos: () => ({
    adminPortal: {
      generateLink,
    },
  }),
  requireEnv: (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable ${name}.`);
    }
    return value;
  },
}));

const originalAppUrl = process.env.APP_URL;
const originalOrganizationId = process.env.WORKOS_ORGANIZATION_ID;

afterEach(() => {
  process.env.APP_URL = originalAppUrl;
  process.env.WORKOS_ORGANIZATION_ID = originalOrganizationId;
  generateLink.mockReset();
});

describe("WorkOS proof helpers", () => {
  it("prefers the authenticated organization id", () => {
    process.env.WORKOS_ORGANIZATION_ID = "org_from_env";

    expect(resolveWorkosOrganizationId("org_from_auth")).toBe("org_from_auth");
  });

  it("falls back to the configured organization id", () => {
    process.env.WORKOS_ORGANIZATION_ID = "org_from_env";

    expect(resolveWorkosOrganizationId()).toBe("org_from_env");
  });

  it("creates an audit logs Admin Portal link for the demo organization", async () => {
    process.env.APP_URL = "https://demo.example.com";
    generateLink.mockResolvedValue({
      link: "https://portal.workos.test/audit",
    });

    await expect(
      createAuditLogsPortalLink({ organizationId: "org_123" }),
    ).resolves.toBe("https://portal.workos.test/audit");
    expect(generateLink).toHaveBeenCalledWith({
      organization: "org_123",
      intent: "audit_logs",
      returnUrl: "https://demo.example.com/demo",
    });
  });
});

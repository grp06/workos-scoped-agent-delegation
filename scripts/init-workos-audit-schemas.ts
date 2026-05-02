import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { WorkOS } from "@workos-inc/node";

import { DOCUMENT_RESOURCE_TYPE } from "../lib/demo-catalog";

loadEnvConfig(process.cwd());

const AUDIT_SCHEMAS = [
  {
    action: "demo.reset",
    targets: [{ type: "demo" }],
    metadata: {
      agentId: "string",
      restoredVisas: "string",
    },
  },
  {
    action: "agent.visa.granted",
    targets: [{ type: "agent" }],
    metadata: {
      grantedPermission: "string",
      expiresAt: "string",
    },
  },
  {
    action: "agent.tool_call.allowed",
    targets: [{ type: DOCUMENT_RESOURCE_TYPE }],
    metadata: {
      decision: "string",
      reason: "string",
      tool: "string",
      resourceName: "string",
      humanHasAccess: "boolean",
      humanAccessSource: "string",
      humanRequiredPermission: "string",
      agentVisaAllows: "boolean",
      requiredPermission: "string",
    },
  },
  {
    action: "agent.tool_call.denied",
    targets: [{ type: DOCUMENT_RESOURCE_TYPE }],
    metadata: {
      decision: "string",
      reason: "string",
      tool: "string",
      resourceName: "string",
      humanHasAccess: "boolean",
      humanAccessSource: "string",
      humanRequiredPermission: "string",
      agentVisaAllows: "boolean",
      requiredPermission: "string",
    },
  },
] as const;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

async function schemaExists(workos: WorkOS, action: string) {
  try {
    const schemas = await workos.auditLogs.listSchemas(action, { limit: 1 });
    return schemas.data.length > 0;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "NotFoundException" || error.message.includes("404"))
    ) {
      return false;
    }

    throw error;
  }
}

async function main() {
  const workos = new WorkOS(requireEnv("WORKOS_API_KEY"));

  for (const schema of AUDIT_SCHEMAS) {
    if (await schemaExists(workos, schema.action)) {
      console.log(`Audit schema exists: ${schema.action}`);
      continue;
    }

    await workos.auditLogs.createSchema(
      {
        ...schema,
        targets: [...schema.targets],
      },
      {
        idempotencyKey: `audit-schema-${schema.action}-${randomUUID()}`,
      },
    );
    console.log(`Created audit schema: ${schema.action}`);
  }

  console.log("WorkOS audit schemas initialized.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

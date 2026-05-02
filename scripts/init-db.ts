import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

import {
  FINANCE_AGENT_ID,
  demoUserSeed,
  financeAgentSeed,
  initialVisaPermissions,
  resourceSeeds,
  visaId,
} from "../lib/demo-data";

loadEnvConfig(process.cwd());

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing required environment variable DATABASE_URL.");
  }

  return databaseUrl;
}

async function main() {
  const sql = neon(requireDatabaseUrl());
  const schema = await readFile(join(process.cwd(), "db/schema.sql"), "utf8");

  for (const statement of schema
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await sql.query(`${statement};`);
  }

  await sql.transaction((tx) => [
    tx`
      insert into demo_users (id, email, name, role)
      values (${demoUserSeed.id}, ${demoUserSeed.email}, ${demoUserSeed.name}, ${demoUserSeed.role})
      on conflict (id) do update set
        email = excluded.email,
        name = excluded.name,
        role = excluded.role
    `,
    tx`
      insert into agents (id, slug, name, description)
      values (${financeAgentSeed.id}, ${financeAgentSeed.slug}, ${financeAgentSeed.name}, ${financeAgentSeed.description})
      on conflict (id) do update set
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description
    `,
    ...resourceSeeds.map(
      (resource) => tx`
        insert into resources (
          id,
          name,
          resource_type,
          category,
          required_read_permission,
          required_export_permission
        )
        values (
          ${resource.id},
          ${resource.name},
          ${resource.resourceType},
          ${resource.category},
          ${resource.requiredReadPermission},
          ${resource.requiredExportPermission}
        )
        on conflict (id) do update set
          name = excluded.name,
          resource_type = excluded.resource_type,
          category = excluded.category,
          required_read_permission = excluded.required_read_permission,
          required_export_permission = excluded.required_export_permission
      `,
    ),
    tx`delete from agent_visas where agent_id = ${FINANCE_AGENT_ID}`,
    ...initialVisaPermissions.map(
      (permission) => tx`
        insert into agent_visas (id, agent_id, permission, expires_at)
        values (
          ${visaId(FINANCE_AGENT_ID, permission)},
          ${FINANCE_AGENT_ID},
          ${permission},
          now() + interval '10 minutes'
        )
        on conflict (id) do update set
          permission = excluded.permission,
          expires_at = excluded.expires_at
      `,
    ),
  ]);

  console.log("Database initialized.");
  console.log("Seeded demo user Alice Chen.");
  console.log("Seeded Finance Agent.");
  console.log("Seeded 4 resources.");
  console.log("Seeded initial visas.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

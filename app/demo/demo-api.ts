import type {
  AuditEvent,
  IntegrationStatus,
  ToolCallResult,
} from "@/lib/types";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const data = await readJson<{ events: AuditEvent[] }>(
    await fetch("/api/audit-log", { cache: "no-store" }),
  );

  return data.events;
}

export async function fetchActiveVisaPermissions(): Promise<string[]> {
  const data = await readJson<{ agentId: string; permissions: string[] }>(
    await fetch("/api/agent/visas", { cache: "no-store" }),
  );

  return data.permissions;
}

export async function fetchIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const data = await readJson<{
    ok: true;
    service: string;
    statuses: IntegrationStatus[];
  }>(await fetch("/api/health", { cache: "no-store" }));

  return data.statuses;
}

export async function runDemoMission(): Promise<ToolCallResult[]> {
  const data = await readJson<{ toolCalls: ToolCallResult[] }>(
    await fetch("/api/demo/run", { method: "POST" }),
  );

  return data.toolCalls;
}

export async function grantDemoVisa(): Promise<void> {
  await readJson<{
    ok: true;
    agentId: string;
    grantedPermission: string;
    expiresAt: string;
  }>(await fetch("/api/agent/grant-visa", { method: "POST" }));
}

export async function resetDemoState(): Promise<void> {
  await readJson<{ ok: true }>(
    await fetch("/api/demo/reset", { method: "POST" }),
  );
}

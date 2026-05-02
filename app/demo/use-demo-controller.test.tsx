// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchActiveVisaPermissions,
  fetchAuditEvents,
  fetchIntegrationStatuses,
  grantDemoVisa,
  resetDemoState,
  runDemoMission,
} from "@/app/demo/demo-api";
import { useDemoController } from "@/app/demo/use-demo-controller";
import {
  AGENT_PERMISSIONS,
  DEMO_RESOURCE_IDS,
  DOCUMENT_RESOURCE_TYPE,
  WORKOS_DOCUMENT_PERMISSIONS,
} from "@/lib/demo-catalog";
import type {
  AuditEvent,
  IntegrationStatus,
  ToolCallResult,
} from "@/lib/types";

vi.mock("@/app/demo/demo-api", () => ({
  fetchActiveVisaPermissions: vi.fn(),
  fetchAuditEvents: vi.fn(),
  fetchIntegrationStatuses: vi.fn(),
  grantDemoVisa: vi.fn(),
  resetDemoState: vi.fn(),
  runDemoMission: vi.fn(),
}));

const mockFetchAuditEvents = vi.mocked(fetchAuditEvents);
const mockFetchActiveVisaPermissions = vi.mocked(fetchActiveVisaPermissions);
const mockFetchIntegrationStatuses = vi.mocked(fetchIntegrationStatuses);
const mockRunDemoMission = vi.mocked(runDemoMission);
const mockGrantDemoVisa = vi.mocked(grantDemoVisa);
const mockResetDemoState = vi.mocked(resetDemoState);
const initialVisas = [
  AGENT_PERMISSIONS.invoiceRead,
  AGENT_PERMISSIONS.invoiceSummarize,
];

function expectCalledBefore(first: ReturnType<typeof vi.fn>, second: ReturnType<typeof vi.fn>) {
  expect(first.mock.invocationCallOrder[0]).toBeLessThan(
    second.mock.invocationCallOrder[0],
  );
}

const auditEvents: AuditEvent[] = [
  {
    id: "audit_1",
    occurredAt: "2026-05-02T18:00:00.000Z",
    actorType: "agent",
    actorId: "finance-agent",
    action: "agent.tool_call.denied",
    targetType: DOCUMENT_RESOURCE_TYPE,
    targetId: DEMO_RESOURCE_IDS.q4Invoices,
    decision: "denied",
    reason: "Denied for test.",
    metadata: {},
    workosStatus: "sent",
    workosError: null,
  },
];

const integrationStatuses: IntegrationStatus[] = [
  {
    key: "authkit",
    label: "WorkOS AuthKit",
    state: "connected",
    detail: "Signed in as alice@example.com.",
  },
];

const toolCalls: ToolCallResult[] = [
  {
    tool: "export_csv",
    resourceId: DEMO_RESOURCE_IDS.q4Invoices,
    resourceName: "q4-invoices.csv",
    humanHasAccess: true,
    humanAccessSource: "workos_fga",
    humanRequiredPermission: WORKOS_DOCUMENT_PERMISSIONS.export,
    agentVisaAllows: true,
    decision: "allowed",
    reason: "Allowed for test.",
    requiredPermission: AGENT_PERMISSIONS.invoiceExport,
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function renderLoadedController() {
  const hook = renderHook(() => useDemoController());

  await waitFor(() => {
    expect(hook.result.current.auditEvents).toEqual(auditEvents);
    expect(hook.result.current.activeVisas).toEqual(initialVisas);
    expect(hook.result.current.integrationStatuses).toEqual(
      integrationStatuses,
    );
  });

  vi.clearAllMocks();
  return hook;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFetchAuditEvents.mockResolvedValue(auditEvents);
  mockFetchActiveVisaPermissions.mockResolvedValue(initialVisas);
  mockFetchIntegrationStatuses.mockResolvedValue(integrationStatuses);
  mockRunDemoMission.mockResolvedValue(toolCalls);
  mockGrantDemoVisa.mockResolvedValue(undefined);
  mockResetDemoState.mockResolvedValue(undefined);
});

describe("useDemoController", () => {
  it("loads audit events, active visas, and integration status on mount", async () => {
    renderHook(() => useDemoController());

    await waitFor(() => {
      expect(mockFetchAuditEvents).toHaveBeenCalledTimes(1);
      expect(mockFetchActiveVisaPermissions).toHaveBeenCalledTimes(1);
      expect(mockFetchIntegrationStatuses).toHaveBeenCalledTimes(1);
    });
  });

  it("runs the mission and refreshes audit events and integration status", async () => {
    const hook = await renderLoadedController();

    await act(async () => {
      await hook.result.current.runMission();
    });

    expect(mockRunDemoMission).toHaveBeenCalledTimes(1);
    expect(mockFetchAuditEvents).toHaveBeenCalledTimes(1);
    expect(mockFetchIntegrationStatuses).toHaveBeenCalledTimes(1);
    expect(mockFetchActiveVisaPermissions).not.toHaveBeenCalled();
    expectCalledBefore(mockRunDemoMission, mockFetchAuditEvents);
    expectCalledBefore(mockFetchAuditEvents, mockFetchIntegrationStatuses);
    expect(hook.result.current.toolCalls).toEqual(toolCalls);
    expect(hook.result.current.status).toBe("Mission complete");
  });

  it("grants a visa and refreshes visas, audit events, and integration status", async () => {
    const hook = await renderLoadedController();

    await act(async () => {
      await hook.result.current.grantVisa();
    });

    expect(mockGrantDemoVisa).toHaveBeenCalledTimes(1);
    expect(mockFetchActiveVisaPermissions).toHaveBeenCalledTimes(1);
    expect(mockFetchAuditEvents).toHaveBeenCalledTimes(1);
    expect(mockFetchIntegrationStatuses).toHaveBeenCalledTimes(1);
    expectCalledBefore(mockGrantDemoVisa, mockFetchActiveVisaPermissions);
    expectCalledBefore(mockFetchActiveVisaPermissions, mockFetchAuditEvents);
    expectCalledBefore(mockFetchAuditEvents, mockFetchIntegrationStatuses);
    expect(hook.result.current.status).toBe(
      "Granted invoice.export to Finance Agent",
    );
  });

  it("resets the demo, clears tool calls, and refreshes visas, audit events, and integration status", async () => {
    const hook = await renderLoadedController();

    await act(async () => {
      await hook.result.current.runMission();
    });

    vi.clearAllMocks();

    await act(async () => {
      await hook.result.current.resetDemo();
    });

    expect(mockResetDemoState).toHaveBeenCalledTimes(1);
    expect(mockFetchActiveVisaPermissions).toHaveBeenCalledTimes(1);
    expect(mockFetchAuditEvents).toHaveBeenCalledTimes(1);
    expect(mockFetchIntegrationStatuses).toHaveBeenCalledTimes(1);
    expectCalledBefore(mockResetDemoState, mockFetchActiveVisaPermissions);
    expectCalledBefore(mockFetchActiveVisaPermissions, mockFetchAuditEvents);
    expectCalledBefore(mockFetchAuditEvents, mockFetchIntegrationStatuses);
    expect(hook.result.current.toolCalls).toEqual([]);
    expect(hook.result.current.status).toBe("Demo reset");
  });

  it("uses the synthetic failing row when integration status loading fails", async () => {
    mockFetchIntegrationStatuses.mockRejectedValue(new Error("health failed"));
    const hook = renderHook(() => useDemoController());

    await waitFor(() => {
      expect(hook.result.current.integrationStatuses).toEqual([
        {
          key: "authkit",
          label: "Integration status",
          state: "failing",
          detail: "Status check failed.",
        },
      ]);
    });
  });

  it("does not let stale initial loads overwrite action results", async () => {
    const initialAudit = deferred<AuditEvent[]>();
    const initialVisaLoad = deferred<string[]>();
    const initialStatuses = deferred<IntegrationStatus[]>();
    mockFetchAuditEvents.mockReturnValueOnce(initialAudit.promise);
    mockFetchActiveVisaPermissions.mockReturnValueOnce(
      initialVisaLoad.promise,
    );
    mockFetchIntegrationStatuses.mockReturnValueOnce(initialStatuses.promise);

    const hook = renderHook(() => useDemoController());

    await act(async () => {
      await hook.result.current.grantVisa();
    });

    initialAudit.resolve([]);
    initialVisaLoad.resolve(["stale.permission"]);
    initialStatuses.resolve([
      {
        key: "authkit",
        label: "Stale",
        state: "failing",
        detail: "Stale status.",
      },
    ]);

    await act(async () => {
      await Promise.all([
        initialAudit.promise,
        initialVisaLoad.promise,
        initialStatuses.promise,
      ]);
    });

    expect(hook.result.current.activeVisas).toEqual(initialVisas);
    expect(hook.result.current.auditEvents).toEqual(auditEvents);
    expect(hook.result.current.integrationStatuses).toEqual(
      integrationStatuses,
    );
    expect(hook.result.current.status).toBe(
      "Granted invoice.export to Finance Agent",
    );
  });
});

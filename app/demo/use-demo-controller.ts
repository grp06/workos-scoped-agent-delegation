"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchActiveVisaPermissions,
  fetchAuditEvents,
  fetchIntegrationStatuses,
  grantDemoVisa,
  resetDemoState,
  runDemoMission,
} from "@/app/demo/demo-api";
import type {
  AuditEvent,
  IntegrationStatus,
  ToolCallResult,
} from "@/lib/types";

export type BusyAction = "mission" | "grant" | "reset" | null;

export interface DemoController {
  toolCalls: ToolCallResult[];
  auditEvents: AuditEvent[];
  activeVisas: string[];
  integrationStatuses: IntegrationStatus[];
  busyAction: BusyAction;
  status: string;
  runMission: () => Promise<void>;
  grantVisa: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const integrationStatusFailureRow: IntegrationStatus = {
  key: "authkit",
  label: "Integration status",
  state: "failing",
  detail: "Status check failed.",
};

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useDemoController(): DemoController {
  const generationRef = useRef(0);
  const [toolCalls, setToolCalls] = useState<ToolCallResult[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [activeVisas, setActiveVisas] = useState<string[]>([]);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    IntegrationStatus[]
  >([]);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [status, setStatus] = useState("Ready");

  async function refreshAuditEvents() {
    setAuditEvents(await fetchAuditEvents());
  }

  async function refreshActiveVisas() {
    setActiveVisas(await fetchActiveVisaPermissions());
  }

  async function refreshIntegrationStatus() {
    try {
      setIntegrationStatuses(await fetchIntegrationStatuses());
    } catch {
      setIntegrationStatuses([integrationStatusFailureRow]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const generation = generationRef.current;

    Promise.all([fetchAuditEvents(), fetchActiveVisaPermissions()])
      .then(([events, permissions]) => {
        if (!cancelled && generation === generationRef.current) {
          setAuditEvents(events);
          setActiveVisas(permissions);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && generation === generationRef.current) {
          setStatus(messageFromError(error));
        }
      });

    fetchIntegrationStatuses()
      .then((statuses) => {
        if (!cancelled && generation === generationRef.current) {
          setIntegrationStatuses(statuses);
        }
      })
      .catch(() => {
        if (!cancelled && generation === generationRef.current) {
          setIntegrationStatuses([integrationStatusFailureRow]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function runMission() {
    generationRef.current += 1;
    setBusyAction("mission");
    setStatus("Running mission");

    try {
      setToolCalls(await runDemoMission());
      await refreshAuditEvents();
      await refreshIntegrationStatus();
      setStatus("Mission complete");
    } catch (error) {
      setStatus(messageFromError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function grantVisa() {
    generationRef.current += 1;
    setBusyAction("grant");
    setStatus("Granting invoice.export");

    try {
      await grantDemoVisa();
      await refreshActiveVisas();
      await refreshAuditEvents();
      await refreshIntegrationStatus();
      setStatus("Granted invoice.export to Finance Agent");
    } catch (error) {
      setStatus(messageFromError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function resetDemo() {
    generationRef.current += 1;
    setBusyAction("reset");
    setStatus("Resetting demo");

    try {
      await resetDemoState();
      setToolCalls([]);
      await refreshActiveVisas();
      await refreshAuditEvents();
      await refreshIntegrationStatus();
      setStatus("Demo reset");
    } catch (error) {
      setStatus(messageFromError(error));
    } finally {
      setBusyAction(null);
    }
  }

  return {
    toolCalls,
    auditEvents,
    activeVisas,
    integrationStatuses,
    busyAction,
    status,
    runMission,
    grantVisa,
    resetDemo,
  };
}

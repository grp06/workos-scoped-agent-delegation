import type { AuditEvent, IntegrationStatus } from "@/lib/types";

export function getFgaIntegrationStatus({
  events,
  configured,
}: {
  events: AuditEvent[];
  configured: boolean;
}): IntegrationStatus {
  if (!configured) {
    return {
      key: "fga",
      label: "WorkOS FGA",
      state: "notConfigured",
      detail: "Missing WorkOS authorization environment.",
    };
  }

  const observedFga = events.some(
    (event) =>
      event.metadata.humanAccessSource === "workos_fga" ||
      (typeof event.metadata.humanRequiredPermission === "string" &&
        event.metadata.humanRequiredPermission.startsWith("document:")),
  );

  return observedFga
    ? {
        key: "fga",
        label: "WorkOS FGA",
        state: "connected",
        detail: "Last mission used WorkOS Authorization.",
      }
    : {
        key: "fga",
        label: "WorkOS FGA",
        state: "ready",
        detail: "Configured; run mission to observe a check.",
      };
}

export function getAuditLogsIntegrationStatus({
  events,
  loadFailed = false,
}: {
  events: AuditEvent[];
  loadFailed?: boolean;
}): IntegrationStatus {
  if (loadFailed) {
    return {
      key: "auditLogs",
      label: "WorkOS Audit Logs",
      state: "failing",
      detail: "Local audit events could not be loaded.",
    };
  }

  if (!events.length) {
    return {
      key: "auditLogs",
      label: "WorkOS Audit Logs",
      state: "noEventsYet",
      detail: "No local audit events yet.",
    };
  }

  if (events.some((event) => event.workosStatus === "sent")) {
    return {
      key: "auditLogs",
      label: "WorkOS Audit Logs",
      state: "connected",
      detail: "At least one event sent to WorkOS.",
    };
  }

  if (events.every((event) => event.workosStatus === "failed")) {
    return {
      key: "auditLogs",
      label: "WorkOS Audit Logs",
      state: "failing",
      detail: "Most recent WorkOS audit send failed.",
    };
  }

  return {
    key: "auditLogs",
    label: "WorkOS Audit Logs",
    state: "ready",
    detail: "Local events exist; WorkOS delivery is pending.",
  };
}

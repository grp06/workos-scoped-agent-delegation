"use client";

import { useState } from "react";
import { CheckCircle2, ScrollText, XCircle } from "lucide-react";

import type { AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AuditReplayProps {
  events: AuditEvent[];
}

type AuditFilter = "all" | "allowed" | "denied" | "scopeGrants" | "workosSent";

const filters: Array<{ key: AuditFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "allowed", label: "Allowed" },
  { key: "denied", label: "Denied" },
  { key: "scopeGrants", label: "Scope grants" },
  { key: "workosSent", label: "WorkOS sent" },
];

function filterEvents(events: AuditEvent[], filter: AuditFilter) {
  if (filter === "allowed") {
    return events.filter((event) => event.decision === "allowed");
  }

  if (filter === "denied") {
    return events.filter((event) => event.decision === "denied");
  }

  if (filter === "scopeGrants") {
    return events.filter((event) => event.action === "agent.visa.granted");
  }

  if (filter === "workosSent") {
    return events.filter((event) => event.workosStatus === "sent");
  }

  return events;
}

export default function AuditReplay({ events }: AuditReplayProps) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const visibleEvents = filterEvents(events, filter);

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">
        No audit events yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-zinc-100 shadow-sm">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ScrollText className="size-4" />
            {visibleEvents.length} of {events.length} events
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => setFilter(candidate.key)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium transition",
                  filter === candidate.key
                    ? "border-blue-500 bg-blue-500/10 text-blue-200"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]",
                )}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-h-[520px] divide-y divide-white/10 overflow-auto">
        {visibleEvents.length === 0 ? (
          <div className="p-4 text-sm text-zinc-400">
            No matching audit events.
          </div>
        ) : null}
        {visibleEvents.map((event) => (
          <div key={event.id} className="grid gap-2 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <AuditDecisionIcon decision={event.decision} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        event.decision === "allowed" && "text-emerald-300",
                        event.decision === "denied" && "text-red-300",
                        !event.decision && "text-blue-300",
                      )}
                    >
                      {event.decision ?? "workos sent"}
                    </span>
                    <span className="font-semibold text-white">
                      {event.action}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-zinc-400">
                    {event.actorType}:{event.actorId} {"->"} {event.targetType}:
                    {event.targetId}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">
                {new Date(event.occurredAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            {event.reason ? (
              <p className="pl-8 text-sm text-zinc-400">{event.reason}</p>
            ) : null}
            <p className="pl-8 text-xs text-zinc-500">
              WorkOS: {event.workosStatus}
              {event.workosError ? " (see server logs)" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditDecisionIcon({ decision }: { decision: AuditEvent["decision"] }) {
  if (decision === "allowed") {
    return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />;
  }

  if (decision === "denied") {
    return <XCircle className="mt-0.5 size-4 shrink-0 text-red-400" />;
  }

  return <ScrollText className="mt-0.5 size-4 shrink-0 text-blue-300" />;
}

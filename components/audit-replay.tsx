"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

import type { AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AuditReplayProps {
  events: AuditEvent[];
}

type AuditFilter = "all" | "allowed" | "denied" | "visaGrants" | "workosSent";

const filters: Array<{ key: AuditFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "allowed", label: "Allowed" },
  { key: "denied", label: "Denied" },
  { key: "visaGrants", label: "Visa grants" },
  { key: "workosSent", label: "WorkOS sent" },
];

function filterEvents(events: AuditEvent[], filter: AuditFilter) {
  if (filter === "allowed") {
    return events.filter((event) => event.decision === "allowed");
  }

  if (filter === "denied") {
    return events.filter((event) => event.decision === "denied");
  }

  if (filter === "visaGrants") {
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
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
        No audit events yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white text-zinc-950 shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
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
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="divide-y divide-zinc-200">
        {visibleEvents.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            No matching audit events.
          </div>
        ) : null}
        {visibleEvents.map((event) => (
          <div key={event.id} className="grid gap-2 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-zinc-950">
                {event.action}
              </span>
              <span className="text-xs text-zinc-500">
                {new Date(event.occurredAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="grid gap-1 text-zinc-600">
              <p>
                {event.actorType}:{event.actorId} {"->"} {event.targetType}:
                {event.targetId}
              </p>
              {event.decision ? (
                <p>
                  Decision:{" "}
                  <span className="font-medium uppercase">
                    {event.decision}
                  </span>
                </p>
              ) : null}
              {event.reason ? <p>{event.reason}</p> : null}
              <p className="text-xs text-zinc-500">
                WorkOS: {event.workosStatus}
                {event.workosError ? " (see server logs)" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

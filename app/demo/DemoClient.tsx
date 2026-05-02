"use client";

import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileText,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import AuditReplay from "@/components/audit-replay";
import PassportCheckCard from "@/components/passport-check-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDemoSteps,
  getPreparedExport,
  type DemoStep,
} from "@/app/demo/demo-state";
import { useDemoController } from "@/app/demo/use-demo-controller";
import type { IntegrationStatus } from "@/lib/types";

interface DemoClientProps {
  signedInEmail: string;
  signedInName: string;
}

export default function DemoClient({
  signedInEmail,
  signedInName,
}: DemoClientProps) {
  const {
    toolCalls,
    auditEvents,
    activeVisas,
    integrationStatuses,
    busyAction,
    status,
    runMission,
    grantVisa,
    resetDemo,
  } = useDemoController();

  const demoSteps = getDemoSteps({
    signedInEmail,
    toolCalls,
    activeVisas,
    auditEvents,
  });
  const preparedExport = getPreparedExport(toolCalls);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <SetupCard
          icon={<UserRound className="size-5" />}
          label="Human"
          title={signedInName}
          rows={[
            ["Access source", "WorkOS FGA"],
            ["Signed in", signedInEmail],
          ]}
        />
        <SetupCard
          icon={<KeyRound className="size-5" />}
          label="Agent"
          title="Finance Agent"
          rows={[
            [
              "Active visas",
              activeVisas.length > 0 ? activeVisas.join(", ") : "none",
            ],
            ["Expires", "10 minutes"],
          ]}
        />
        <SetupCard
          icon={<Database className="size-5" />}
          label="Resources"
          title="Enterprise data room"
          rows={[
            ["Invoice", "q4-invoices.csv"],
            ["Payroll", "payroll.xlsx"],
            ["Board", "board-deck.pdf"],
            ["Contracts", "customer-contracts.pdf"],
          ]}
        />
      </section>

      <DemoStepper steps={demoSteps} />

      <section className="rounded-lg border border-white/10 bg-white p-4 text-zinc-950 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium text-zinc-500">Mission control</p>
            <p className="mt-1 text-lg font-semibold">
              Run the scripted finance mission and inspect every passport check.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runMission} disabled={busyAction !== null}>
              {busyAction === "mission" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShieldCheck />
              )}
              Run mission
            </Button>
            <Button
              variant="outline"
              onClick={grantVisa}
              disabled={busyAction !== null}
            >
              {busyAction === "grant" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <BadgeCheck />
              )}
              Grant narrow invoice export visa
            </Button>
            <Button
              variant="outline"
              onClick={resetDemo}
              disabled={busyAction !== null}
            >
              {busyAction === "reset" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              Reset demo
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          <ClipboardList className="size-4 text-zinc-500" />
          {status}
        </div>
      </section>

      <IntegrationStatusPanel statuses={integrationStatuses} />

      {preparedExport ? <PreparedExportPanel exportResult={preparedExport} /> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ShieldCheck className="size-4" />
            Passport checks
          </div>
          {toolCalls.length === 0 ? (
            <EmptyPanel text="No passport checks yet." />
          ) : (
            <div className="grid gap-3">
              {toolCalls.map((toolCall, index) => (
                <PassportCheckCard
                  key={`${toolCall.tool}-${toolCall.resourceId}-${index}`}
                  result={toolCall}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <FileText className="size-4" />
            Audit replay
          </div>
          <AuditReplay events={auditEvents} />
        </div>
      </section>
    </div>
  );
}

function DemoStepper({ steps }: { steps: DemoStep[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white p-4 text-zinc-950 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
        <ShieldCheck className="size-4" />
        Guided demo
      </div>
      <ol className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              "grid min-h-24 gap-2 rounded-md border p-3",
              step.state === "complete" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              step.state === "current" &&
                "border-zinc-950 bg-zinc-950 text-white",
              step.state === "pending" &&
                "border-zinc-200 bg-zinc-50 text-zinc-500",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase">
                Step {index + 1}
              </span>
              {step.state === "complete" ? (
                <CheckCircle2 className="size-4" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold">{step.label}</p>
              <p className="mt-1 text-xs leading-5 opacity-80">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IntegrationStatusPanel({
  statuses,
}: {
  statuses: IntegrationStatus[];
}) {
  const rows =
    statuses.length > 0
      ? statuses
      : [
          {
            key: "authkit" as const,
            label: "Integration status",
            state: "ready" as const,
            detail: "Checking services.",
          },
        ];

  return (
    <section className="rounded-lg border border-white/10 bg-white p-4 text-zinc-950 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
        <Database className="size-4" />
        Real integration status
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((status) => (
          <div
            key={status.key}
            className="grid min-h-24 gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{status.label}</span>
              <span
                className={cn(
                  "rounded-sm px-2 py-1 text-xs font-semibold",
                  status.state === "connected" &&
                    "bg-emerald-100 text-emerald-700",
                  status.state === "ready" &&
                    "bg-blue-100 text-blue-700",
                  status.state === "noEventsYet" &&
                    "bg-zinc-200 text-zinc-700",
                  status.state === "notConfigured" &&
                    "bg-amber-100 text-amber-700",
                  status.state === "failing" && "bg-red-100 text-red-700",
                )}
              >
                {status.state}
              </span>
            </div>
            <p className="text-sm leading-5 text-zinc-600">{status.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreparedExportPanel({
  exportResult,
}: {
  exportResult: {
    filename: string;
    permission: string;
    detail: string;
  };
}) {
  return (
    <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Export result</p>
          <h2 className="mt-1 text-lg font-semibold">
            {exportResult.filename} export prepared
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            Scoped to {exportResult.permission} visa. {exportResult.detail}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
          <Download className="size-5" />
        </div>
      </div>
    </section>
  );
}

function SetupCard({
  icon,
  label,
  title,
  rows,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-4 text-zinc-950 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
          {icon}
        </div>
      </div>
      <dl className="space-y-2">
        {rows.map(([name, value]) => (
          <div
            key={name}
            className="grid grid-cols-[7rem_1fr] gap-3 text-sm"
          >
            <dt className="text-zinc-500">{name}</dt>
            <dd className="min-w-0 break-words font-medium text-zinc-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
      {text}
    </div>
  );
}

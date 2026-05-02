"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { createWorkosAuditPortalLink } from "@/app/demo/demo-api";
import { Button } from "@/components/ui/button";
import {
  getDemoPhase,
  getDemoSteps,
  getInvoiceExportCheck,
  getInvoiceExportAuditProof,
  getPreparedExport,
  getRecentAuditEvents,
  presentAuditEvent,
  type DemoPhase,
  type DemoStep,
  type PreparedExport,
} from "@/app/demo/demo-state";
import { useDemoController } from "@/app/demo/use-demo-controller";
import { AGENT_PERMISSIONS, DEMO_RESOURCE_IDS } from "@/lib/demo-catalog";
import { financeAgentSeed, resourceSeeds } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import type {
  AuditEvent,
  IntegrationStatus,
  ToolCallResult,
} from "@/lib/types";

const invoiceResource = getDemoResource(DEMO_RESOURCE_IDS.q4Invoices);
const payrollResource = getDemoResource(DEMO_RESOURCE_IDS.payroll);
const invoiceExportPermission =
  invoiceResource.requiredExportPermission ?? AGENT_PERMISSIONS.invoiceExport;
const payrollExportPermission =
  payrollResource.requiredExportPermission ?? AGENT_PERMISSIONS.payrollExport;

function getDemoResource(resourceId: string) {
  const resource = resourceSeeds.find(
    (candidate) => candidate.id === resourceId,
  );

  if (!resource) {
    throw new Error(`No demo resource seed found for id ${resourceId}.`);
  }

  return resource;
}

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
  const hasInvoiceVisa = activeVisas.includes(invoiceExportPermission);
  const invoiceExportCheck = getInvoiceExportCheck(toolCalls);
  const payrollDeniedCheck = toolCalls.find(
    (toolCall) =>
      toolCall.tool === "export_csv" &&
      toolCall.resourceId === payrollResource.id &&
      toolCall.decision === "denied",
  );
  const phase = getDemoPhase({ activeVisas, toolCalls });
  const headline = getDemoHeadline({
    phase,
    preparedExport,
    hasInvoiceVisa,
    invoiceExportCheck,
  });
  const primaryAction = getPrimaryAction({
    phase,
    busyAction,
    runMission,
    grantVisa,
    resetDemo,
  });

  return (
    <div className="grid min-w-0 gap-4 overflow-x-hidden">
      <DemoContextBar signedInName={signedInName} />

      <section className="overflow-hidden rounded-xl border border-[#e4e7f3] bg-white text-[#030527] shadow-[0_18px_60px_rgba(3,5,39,0.08)]">
        <div className="border-b border-[#e7e9f5] px-4 py-3">
          <DemoStepper steps={demoSteps} />
        </div>

        <div className="grid min-w-0 items-start gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#656b8a]">
                  Current action
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
                  {headline}
                </h2>
              </div>
              {phase !== "blocked" ? (
                <Button
                  className="h-11 w-full bg-[#6d6df2] px-5 text-base text-white shadow-[0_10px_24px_rgba(109,109,242,0.24)] hover:bg-[#5d5de8] lg:w-auto"
                  onClick={primaryAction.onClick}
                  disabled={busyAction !== null}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              ) : null}
            </div>

            {shouldShowStatus(status) ? <StatusStrip status={status} /> : null}

            <RequestedActionCard />

            <DecisionConsole
              signedInName={signedInName}
              hasInvoiceVisa={hasInvoiceVisa}
              invoiceExportCheck={invoiceExportCheck}
              preparedExport={preparedExport}
              busyAction={busyAction}
              grantVisa={grantVisa}
            />

            {toolCalls.length > 0 ? (
              <NarrowVisaProof
                hasInvoiceVisa={hasInvoiceVisa}
                payrollDeniedCheck={payrollDeniedCheck}
              />
            ) : null}
          </div>

          <aside className="grid min-w-0 content-start gap-3">
            <AuditProof
              events={auditEvents}
              hasMissionRun={toolCalls.length > 0}
            />
            <IntegrationStrip statuses={integrationStatuses} />
            <ResourceSummary />
            {phase !== "complete" ? (
              <Button
                variant="outline"
                onClick={resetDemo}
                disabled={busyAction !== null}
                className="justify-center"
              >
                {busyAction === "reset" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RotateCcw />
                )}
                Reset demo
              </Button>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}

function getPrimaryAction({
  phase,
  busyAction,
  runMission,
  grantVisa,
  resetDemo,
}: {
  phase: DemoPhase;
  busyAction: "mission" | "grant" | "reset" | null;
  runMission: () => void;
  grantVisa: () => void;
  resetDemo: () => void;
}) {
  if (phase === "blocked") {
    return {
      label: `Grant ${invoiceExportPermission}`,
      onClick: grantVisa,
      icon:
        busyAction === "grant" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <BadgeCheck />
        ),
    };
  }

  if (phase === "visaGranted") {
    return {
      label: "Run again",
      onClick: runMission,
      icon:
        busyAction === "mission" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <ShieldCheck />
        ),
    };
  }

  if (phase === "complete") {
    return {
      label: "Reset demo",
      onClick: resetDemo,
      icon:
        busyAction === "reset" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <RotateCcw />
        ),
    };
  }

  return {
    label: "Test agent access",
    onClick: runMission,
    icon:
      busyAction === "mission" ? (
        <Loader2 className="animate-spin" />
      ) : (
        <ShieldCheck />
      ),
  };
}

function getDemoHeadline({
  phase,
  preparedExport,
  hasInvoiceVisa,
  invoiceExportCheck,
}: {
  phase: DemoPhase;
  preparedExport: PreparedExport | null;
  hasInvoiceVisa: boolean;
  invoiceExportCheck?: ToolCallResult;
}) {
  if (phase === "complete" && preparedExport) {
    return `${preparedExport.filename} export allowed and audited`;
  }

  if (phase === "blocked") {
    return `Export blocked: missing ${invoiceExportPermission}`;
  }

  if (phase === "visaGranted" && hasInvoiceVisa && invoiceExportCheck) {
    return `${invoiceExportPermission} scope granted for this agent`;
  }

  return `${financeAgentSeed.name} wants to export ${invoiceResource.name}`;
}

function shouldShowStatus(status: string) {
  return status !== "Ready" && status !== "Access check complete";
}

function DemoContextBar({ signedInName }: { signedInName: string }) {
  return (
    <section className="rounded-xl border border-[#e4e7f3] bg-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <RelationshipChip
          icon={<UserRound />}
          label="Human"
          value={signedInName}
        />
        <RelationshipArrow />
        <RelationshipChip
          icon={<KeyRound />}
          label="Agent"
          value={financeAgentSeed.name}
        />
        <RelationshipArrow />
        <RelationshipChip
          icon={<Database />}
          label="Scope"
          value="Finance data room"
        />
      </div>
    </section>
  );
}

function RelationshipChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-[#e4e7f3] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(3,5,39,0.04)]">
      <span className="text-[#656b8a] [&>svg]:size-4">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8f96bd]">
        {label}
      </span>
      <span className="truncate text-sm font-semibold text-[#030527]">
        {value}
      </span>
    </span>
  );
}

function RelationshipArrow() {
  return (
    <span className="hidden text-[#8f96bd] sm:inline" aria-hidden="true">
      →
    </span>
  );
}

function DemoStepper({ steps }: { steps: DemoStep[] }) {
  return (
    <ol className="relative grid grid-cols-2 gap-x-3 gap-y-3 before:absolute before:left-4 before:right-4 before:top-4 before:hidden before:h-px before:bg-[#e4e7f3] sm:grid-cols-3 lg:grid-cols-6 lg:before:block">
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={cn(
            "relative z-10 flex min-w-0 items-center gap-2 text-sm lg:flex-col lg:items-center lg:gap-2",
            step.state === "pending" && "text-[#656b8a]",
          )}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border bg-white text-xs font-semibold",
              step.state === "complete" &&
                "border-[#3ff1c7] bg-[#3ff1c7] text-[#030527]",
              step.state === "current" &&
                "border-[#6d6df2] text-[#6d6df2] shadow-[0_0_0_4px_rgba(109,109,242,0.14)]",
              step.state === "pending" && "border-[#dce0ef] text-[#656b8a]",
            )}
          >
            {step.state === "complete" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              index + 1
            )}
          </span>
          <span
            className={cn(
              "min-w-0 truncate text-xs font-semibold sm:text-sm lg:max-w-full lg:text-center",
              step.state === "pending" && "text-[#656b8a]",
              step.state !== "pending" && "text-[#030527]",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function StatusStrip({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#bff8e9] bg-[#e9fff9] px-3 py-2 text-sm font-medium text-[#087a62]">
      <ClipboardList className="size-4 text-[#087a62]" />
      {status}
    </div>
  );
}

function RequestedActionCard() {
  return (
    <section className="rounded-xl border border-[#e4e7f3] bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#656b8a]">
            Requested action
          </p>
          <p className="mt-1 text-base font-semibold text-[#030527]">
            {financeAgentSeed.name} wants to run{" "}
            <CodeToken>export_csv</CodeToken> on{" "}
            <CodeToken>{invoiceResource.name}</CodeToken>
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3 lg:max-w-[560px]">
          <ActionFact label="Tool" value="export_csv" />
          <ActionFact label="Resource" value={invoiceResource.name} />
          <ActionFact label="Required scope" value={invoiceExportPermission} />
        </div>
      </div>
    </section>
  );
}

function ActionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e4e7f3] bg-[#fafbff] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8f96bd]">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-sm font-semibold text-[#030527]">
        {value}
      </p>
    </div>
  );
}

function CodeToken({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-[#f3f6ff] px-1.5 py-1 font-mono text-base font-semibold text-[#4e4ee0]">
      {children}
    </code>
  );
}

function DecisionConsole({
  signedInName,
  hasInvoiceVisa,
  invoiceExportCheck,
  preparedExport,
  busyAction,
  grantVisa,
}: {
  signedInName: string;
  hasInvoiceVisa: boolean;
  invoiceExportCheck?: ToolCallResult;
  preparedExport: PreparedExport | null;
  busyAction: "mission" | "grant" | "reset" | null;
  grantVisa: () => void;
}) {
  const hasAttempt = Boolean(invoiceExportCheck);
  const allowed = invoiceExportCheck?.decision === "allowed";
  const retryReady = hasAttempt && hasInvoiceVisa && !allowed;
  const blocked = hasAttempt && !allowed && !retryReady;
  const decisionLabel = allowed
    ? "Allowed"
    : blocked
      ? "Blocked"
      : retryReady
        ? "Scope granted"
        : "Not checked";
  const decisionText = preparedExport
    ? `${preparedExport.filename} export prepared`
    : blocked
      ? `Agent is missing ${invoiceExportPermission}`
      : hasInvoiceVisa
        ? "Scope granted; run again to export"
        : "Test agent access to see the decision";
  const humanGateValue = !hasAttempt
    ? "Pending"
    : invoiceExportCheck?.humanHasAccess
      ? "Allowed"
      : "Denied";
  const humanGateDetail = !hasAttempt
    ? `WorkOS FGA will check whether ${signedInName} can use ${invoiceExportPermission}.`
    : invoiceExportCheck?.humanHasAccess
      ? `AuthKit user + WorkOS FGA allowed ${invoiceExportCheck.humanRequiredPermission}.`
      : `WorkOS FGA denied ${invoiceExportCheck?.humanRequiredPermission ?? invoiceExportPermission}.`;
  const humanGateTone = !hasAttempt
    ? "neutral"
    : invoiceExportCheck?.humanHasAccess
      ? "good"
      : "bad";

  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        allowed && "border-[#bff8e9] bg-[#e9fff9]",
        blocked && "border-red-200 bg-red-50",
        retryReady && "border-[#d9dcff] bg-[#f3f6ff]",
        !allowed && !blocked && !retryReady && "border-[#e4e7f3] bg-[#fafbff]",
      )}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-[#656b8a]">Decision</p>
          <div className="mt-2 flex items-center gap-3">
            <DecisionIcon allowed={allowed} blocked={blocked} />
            <h3 className="text-3xl font-semibold tracking-normal sm:text-4xl">
              {decisionLabel}
            </h3>
          </div>
          <p className="mt-3 max-w-2xl text-lg font-medium text-[#29363d]">
            {decisionText}
          </p>
        </div>
        <StatusPill
          label={
            allowed
              ? "export_csv allowed"
              : blocked
                ? "export_csv denied"
                : retryReady
                  ? "retry ready"
                  : "waiting"
          }
          className={cn(
            allowed && "bg-[#bff8e9] text-[#087a62]",
            blocked && "bg-red-100 text-red-700",
            retryReady && "bg-[#e3e6ff] text-[#4e4ee0]",
            !allowed &&
              !blocked &&
              !retryReady &&
              "bg-[#eceef8] text-[#656b8a]",
          )}
        />
      </div>

      <div className="mt-5 rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold text-[#29363d]">
        Final decision = human access + agent scope
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <GateRow
          label="Human access from WorkOS"
          value={humanGateValue}
          detail={humanGateDetail}
          tone={humanGateTone}
        />
        <GateRow
          label="Agent scope"
          value={hasInvoiceVisa ? "Granted" : "Missing"}
          detail={
            hasInvoiceVisa
              ? `${invoiceExportPermission} active`
              : `No ${invoiceExportPermission} scope`
          }
          tone={hasInvoiceVisa ? "good" : "bad"}
        />
      </div>

      {blocked ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-red-950">
              Grant the missing scope
            </p>
            <p className="mt-1 text-sm text-red-800">
              Allow only {invoiceExportPermission} for this agent run.
            </p>
          </div>
          <Button
            className="h-10 w-full shrink-0 bg-[#6d6df2] px-4 text-white shadow-[0_10px_24px_rgba(109,109,242,0.24)] hover:bg-[#5d5de8] sm:w-auto"
            onClick={grantVisa}
            disabled={busyAction !== null}
          >
            {busyAction === "grant" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <BadgeCheck />
            )}
            Grant {invoiceExportPermission}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function DecisionIcon({
  allowed,
  blocked,
}: {
  allowed: boolean;
  blocked: boolean;
}) {
  if (allowed) {
    return (
      <span className="flex size-12 items-center justify-center rounded-lg bg-[#bff8e9] text-[#087a62]">
        <ShieldCheck className="size-7" />
      </span>
    );
  }

  if (blocked) {
    return (
      <span className="flex size-12 items-center justify-center rounded-lg bg-red-100 text-red-700">
        <XCircle className="size-7" />
      </span>
    );
  }

  return (
    <span className="flex size-12 items-center justify-center rounded-lg bg-[#eceef8] text-[#656b8a]">
      <ShieldAlert className="size-7" />
    </span>
  );
}

function GateRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-white/80 bg-white/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{label}</p>
        <StatusPill
          label={value}
          className={cn(
            tone === "good" && "bg-[#bff8e9] text-[#087a62]",
            tone === "bad" && "bg-red-100 text-red-700",
            tone === "neutral" && "bg-[#eceef8] text-[#656b8a]",
          )}
        />
      </div>
      <p className="mt-2 text-sm text-[#656b8a]">{detail}</p>
    </div>
  );
}

function NarrowVisaProof({
  hasInvoiceVisa,
  payrollDeniedCheck,
}: {
  hasInvoiceVisa: boolean;
  payrollDeniedCheck?: ToolCallResult;
}) {
  const title = hasInvoiceVisa
    ? "Payroll export still denied"
    : "Payroll export also denied";
  const detail = hasInvoiceVisa
    ? `The invoice scope stayed narrow and did not grant ${payrollExportPermission}.`
    : `The agent does not have ${payrollExportPermission}, so payroll stays out of scope.`;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-white p-4 text-red-950">
      <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-red-800">{detail}</p>
        {payrollDeniedCheck ? (
          <p className="mt-2 text-xs font-semibold text-red-700">
            Denied {payrollDeniedCheck.tool} on{" "}
            {payrollDeniedCheck.resourceName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AuditProof({
  events,
  hasMissionRun,
}: {
  events: AuditEvent[];
  hasMissionRun: boolean;
}) {
  const [portalState, setPortalState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [portalError, setPortalError] = useState<string | null>(null);
  const previewEvents = getRecentAuditEvents(events);
  const invoiceExportProof = getInvoiceExportAuditProof(events);
  const sentEvents = events.filter((event) => event.workosStatus === "sent");

  async function openWorkosAuditPortal() {
    setPortalState("loading");
    setPortalError(null);

    try {
      window.location.href = await createWorkosAuditPortalLink();
    } catch (error) {
      setPortalState("error");
      setPortalError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="rounded-xl border border-[#e4e7f3] bg-[#fafbff] p-4 text-[#030527]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#29363d]">
          <FileText className="size-4 text-[#656b8a]" />
          <span className="min-w-0 break-words">
            Invoice export audit proof
          </span>
        </div>
        <StatusPill
          label={invoiceExportProof ? "WorkOS sent" : "Waiting"}
          className={
            invoiceExportProof
              ? "bg-[#bff8e9] text-[#087a62]"
              : "bg-[#eceef8] text-[#656b8a]"
          }
        />
      </div>

      {invoiceExportProof ? (
        <div className="mt-4 rounded-lg border border-[#e4e7f3] bg-white p-3">
          <p className="text-xs font-semibold uppercase text-[#656b8a]">
            Proof event
          </p>
          <p className="mt-2 font-semibold text-[#030527]">
            {invoiceExportProof.action}
          </p>
          <p className="mt-1 break-words text-sm leading-5 text-[#656b8a]">
            {invoiceExportProof.actorType}:{invoiceExportProof.actorId} →{" "}
            {invoiceExportProof.targetType}:{invoiceExportProof.targetId}
          </p>
          <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#087a62]">
            {invoiceResource.name} allowed with {invoiceExportPermission}
          </p>
        </div>
      ) : hasMissionRun && sentEvents.length > 0 ? (
        <p className="mt-4 rounded-lg border border-[#e4e7f3] bg-white p-3 text-sm text-[#656b8a]">
          Waiting for the successful invoice export event.
        </p>
      ) : (
        <p className="mt-4 rounded-lg border border-[#e4e7f3] bg-white p-3 text-sm text-[#656b8a]">
          Test agent access to create audit events.
        </p>
      )}

      {hasMissionRun && previewEvents.length > 1 ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs font-semibold uppercase text-[#8f96bd]">
            Recent events
          </p>
          {previewEvents.map((event) => (
            <PresentedAuditRow key={event.id} event={event} />
          ))}
        </div>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full justify-center"
        onClick={openWorkosAuditPortal}
        disabled={portalState === "loading"}
      >
        {portalState === "loading" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <FileText />
        )}
        Open in WorkOS Audit Logs
      </Button>

      {portalState === "error" ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-800">
          WorkOS audit portal unavailable
          {portalError ? `: ${portalError}` : "."}
        </p>
      ) : null}
    </section>
  );
}

function PresentedAuditRow({ event }: { event: AuditEvent }) {
  const presented = presentAuditEvent(event);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-sm">
      <div className="min-w-0">
        <p className="break-words font-medium text-[#29363d]">
          {presented.title}
        </p>
        <p className="mt-0.5 break-words text-xs text-[#8f96bd]">
          {presented.detail}
        </p>
      </div>
      <span
        className={cn(
          "min-w-0 justify-self-end break-words text-right text-xs font-semibold",
          event.decision === "allowed" && "text-[#087a62]",
          event.decision === "denied" && "text-red-700",
          !event.decision && "text-[#4e4ee0]",
        )}
      >
        {presented.status}
      </span>
    </div>
  );
}

function IntegrationStrip({ statuses }: { statuses: IntegrationStatus[] }) {
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
    <section className="rounded-xl border border-[#e4e7f3] bg-[#fafbff] p-4 text-sm text-[#030527]">
      <div className="mb-3 flex min-w-0 items-center gap-2 font-semibold text-[#29363d]">
        <Database className="size-4 text-[#656b8a]" />
        <span className="min-w-0 break-words">WorkOS APIs used</span>
      </div>
      <div className="grid gap-2">
        {rows.map((status) => (
          <ApiUsageRow key={status.key} status={status} />
        ))}
      </div>
    </section>
  );
}

function ApiUsageRow({ status }: { status: IntegrationStatus }) {
  const usageByKey: Record<IntegrationStatus["key"], string> = {
    authkit: "Signed-in user",
    database: "Stored demo state",
    fga: "Checked human access",
    auditLogs: "Recorded decisions",
  };

  return (
    <div className="rounded-lg border border-[#e4e7f3] bg-white p-3">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <p className="min-w-0 font-semibold text-[#030527]">{status.label}</p>
        <StatusPill
          label={status.state === "noEventsYet" ? "ready" : status.state}
          className={cn(
            "bg-[#eceef8] text-[#656b8a]",
            status.state === "connected" && "bg-[#bff8e9] text-[#087a62]",
            status.state === "ready" && "bg-[#e3e6ff] text-[#4e4ee0]",
            status.state === "noEventsYet" && "bg-[#e3e6ff] text-[#4e4ee0]",
            status.state === "failing" && "bg-red-100 text-red-700",
            status.state === "notConfigured" && "bg-amber-100 text-amber-700",
          )}
        />
      </div>
      <p className="mt-1 text-sm text-[#656b8a]">{usageByKey[status.key]}</p>
    </div>
  );
}

function ResourceSummary() {
  return (
    <section className="rounded-xl border border-[#e4e7f3] bg-[#fafbff] p-4 text-sm text-[#030527]">
      <p className="break-words font-semibold text-[#29363d]">
        Protected resources
      </p>
      <div className="mt-3 grid gap-2">
        {resourceSeeds.map((resource) => (
          <ResourceLine
            key={resource.id}
            label={resource.category}
            value={resource.name}
            exportPermission={resource.requiredExportPermission}
            readPermission={resource.requiredReadPermission}
          />
        ))}
      </div>
    </section>
  );
}

function ResourceLine({
  label,
  value,
  exportPermission,
  readPermission,
}: {
  label: string;
  value: string;
  exportPermission: string | null;
  readPermission: string;
}) {
  return (
    <div className="rounded-lg border border-[#e4e7f3] bg-white p-3">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="font-semibold capitalize text-[#29363d]">{label}</span>
        <span className="min-w-0 break-words text-right font-semibold text-[#030527]">
          {value}
        </span>
      </div>
      <p className="mt-1 break-words text-xs font-medium text-[#656b8a]">
        {exportPermission ? "Export permission:" : "Read permission:"}{" "}
        <span className="font-mono font-semibold text-[#4e4ee0]">
          {exportPermission ?? readPermission}
        </span>
      </p>
    </div>
  );
}

function StatusPill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center rounded-md px-2 py-1 text-xs font-semibold capitalize",
        className,
      )}
    >
      {label}
    </span>
  );
}

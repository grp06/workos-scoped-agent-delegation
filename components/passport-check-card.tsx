import { CheckCircle2, Equal, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ToolCallResult } from "@/lib/types";

interface PassportCheckCardProps {
  result: ToolCallResult;
}

export default function PassportCheckCard({ result }: PassportCheckCardProps) {
  const allowed = result.decision === "allowed";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-zinc-500">Tool call</p>
          <h3 className="mt-1 text-xl font-semibold">{result.tool}</h3>
          <p className="mt-1 text-sm text-zinc-600">{result.resourceName}</p>
        </div>
        <div
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-black tracking-normal",
            allowed
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-red-300 bg-red-50 text-red-700",
          )}
        >
          {allowed ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          {allowed ? "ALLOWED" : "DENIED"}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          <DecisionLine
            label="WorkOS human access"
            value={result.humanHasAccess}
            detail={result.humanRequiredPermission}
          />
          <Operator text="AND" />
          <DecisionLine
            label="Agent visa"
            value={result.agentVisaAllows}
            detail={result.requiredPermission ?? "not configured"}
          />
          <Operator icon={<Equal className="size-4" />} />
          <DecisionLine
            label="Final decision"
            value={allowed}
            detail={allowed ? "allowed" : "denied"}
            strong
          />
        </div>
      </div>

      <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm leading-6 text-zinc-700">
        {result.reason}
      </p>
    </article>
  );
}

function DecisionLine({
  label,
  value,
  detail,
  strong = false,
}: {
  label: string;
  value: boolean;
  detail: string;
  strong?: boolean;
}) {
  return (
    <div className="grid min-h-24 gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-600">{label}</span>
        <span
          className={cn(
            "rounded-sm px-2 py-1 text-xs font-semibold uppercase",
            value
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          )}
        >
          {strong ? (value ? "allowed" : "denied") : value ? "yes" : "no"}
        </span>
      </div>
      <span
        className="break-words font-mono text-xs text-zinc-500"
        title={detail}
      >
        {detail}
      </span>
    </div>
  );
}

function Operator({
  text,
  icon,
}: {
  text?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex h-8 items-center justify-center rounded-md bg-zinc-200 px-2 text-xs font-bold text-zinc-600 sm:h-auto sm:bg-transparent">
      {icon ?? text}
    </div>
  );
}

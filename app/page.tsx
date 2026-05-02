import Link from "next/link";
import { BadgeCheck, Fingerprint, ScrollText, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[1fr_auto] px-6 py-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <ShieldCheck className="size-4" />
              WorkOS demo
            </div>
            <h1 className="text-5xl font-semibold tracking-normal text-zinc-950 sm:text-6xl">
              Agent Passport Control
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-8 text-zinc-600">
              Scoped delegation for AI agents using WorkOS AuthKit,
              Authorization/FGA, and Audit Logs.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
              A human can have broad access, but an agent only gets a narrow,
              temporary visa. Every tool call is checked by both gates,
              explained, and recorded.
            </p>
            <Link
              href="/demo"
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Open live demo
              <BadgeCheck className="size-4" />
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Finance Agent
                </p>
                <p className="text-lg font-semibold">Payroll export request</p>
              </div>
              <Fingerprint className="size-6 text-emerald-700" />
            </div>
            <div className="space-y-3">
              {[
                ["WorkOS FGA", "Alice can view payroll", "allowed"],
                ["Agent visa", "Finance Agent lacks payroll.export", "denied"],
                ["Audit Logs", "agent.tool_call.denied", "recorded"],
              ].map(([label, value, state]) => (
                <div
                  key={label}
                  className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 px-3 py-3"
                >
                  <span className="text-sm font-medium text-zinc-500">
                    {label}
                  </span>
                  <span className="text-sm text-zinc-900">{value}</span>
                  <span
                    className={
                      state === "denied"
                        ? "rounded-sm bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                        : "rounded-sm bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    }
                  >
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-zinc-200 pt-5 text-sm text-zinc-600 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-zinc-500" />
            Agent identity
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-zinc-500" />
            Scoped visas
          </div>
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-zinc-500" />
            Local and WorkOS audit trail
          </div>
        </div>
      </section>
    </main>
  );
}

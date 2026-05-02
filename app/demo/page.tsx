import { withAuth } from "@workos-inc/authkit-nextjs";

import DemoClient from "@/app/demo/DemoClient";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const signedInName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfcff] text-[#030527]">
      <header className="border-b border-[#e7e9f5] bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-3">
              <WorkOSMark />
              <span className="truncate text-xl font-semibold tracking-normal text-[#1f2933]">
                WorkOS
              </span>
            </div>
            <div className="hidden rounded-full border border-[#e4e7f3] bg-white px-3 py-2 text-sm font-medium text-[#29363d] shadow-sm md:block">
              Scoped Agent Delegation
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[#d7f8ee] bg-[#e9fff9] px-3 py-2 text-sm font-medium text-[#087a62] sm:flex">
              <span className="size-2 rounded-full bg-[#3ff1c7]" />
              Live
            </div>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="h-9 rounded-full border border-[#e4e7f3] bg-white px-4 text-sm font-medium text-[#29363d] shadow-sm transition hover:border-[#6d6df2]/40 hover:text-[#6d6df2]"
              >
                Sign out
              </button>
            </form>
            <div className="hidden size-9 items-center justify-center rounded-full bg-[#030527] text-sm font-semibold text-white sm:flex">
              {signedInName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 overflow-x-hidden px-4 py-4 sm:px-5">
        <h1 className="text-2xl font-semibold tracking-normal text-[#030527]">
          Finance data room
        </h1>
        <DemoClient signedInEmail={user.email} signedInName={signedInName} />
      </div>
    </main>
  );
}

function WorkOSMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-8 shrink-0"
      viewBox="0 0 32 32"
      fill="none"
    >
      <path
        d="M10.45 4h11.1L29 16l-7.45 12h-11.1L3 16 10.45 4Z"
        fill="#6D6DF2"
      />
      <path d="M13.5 8h5L23 16l-4.5 8h-5L18 16 13.5 8Z" fill="white" />
      <path d="M10.2 8 5.8 16l4.4 8 4.45-8L10.2 8Z" fill="#6D6DF2" />
    </svg>
  );
}

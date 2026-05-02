import { signOut, withAuth } from "@workos-inc/authkit-nextjs";

import DemoClient from "@/app/demo/DemoClient";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const signedInName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              Agent Passport Control
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Finance data room
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ returnTo: "/" });
            }}
          >
            <button
              type="submit"
              className="h-9 rounded-md border border-white/20 px-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </header>

        <DemoClient signedInEmail={user.email} signedInName={signedInName} />
      </div>
    </main>
  );
}

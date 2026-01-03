export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">AffiliateKaro</h1>
        <p className="text-neutral-600">
          India-first affiliate & referral management for D2C brands and SaaS.
        </p>
      </div>

      <div className="flex gap-3">
        <a
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          href="/signup"
        >
          Create account
        </a>
        <a className="rounded-md border px-4 py-2 text-sm" href="/login">
          Log in
        </a>
        <a
          className="rounded-md border px-4 py-2 text-sm"
          href="/dashboard/programs"
        >
          Dashboard
        </a>
      </div>

      <div className="rounded-lg border p-4 text-sm text-neutral-600">
        MVP scope (Phase 1): auth, organization isolation, program CRUD.
      </div>
    </main>
  );
}

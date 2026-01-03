import { requireSession } from "@/lib/session";
import SettingsClient from "@/app/dashboard/settings/settings-client";

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings & Integrations</h1>
        <p className="text-sm text-neutral-600">
          Copy the values below into your checkout / backend integration.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Organization ID</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Use this as <code>ak_org</code> in Razorpay notes.
        </p>
        <code className="mt-2 block rounded-md border bg-neutral-50 px-3 py-2 text-xs">
          {session.organizationId}
        </code>
      </section>

      <SettingsClient organizationId={session.organizationId} />
    </div>
  );
}


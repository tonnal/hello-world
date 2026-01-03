"use client";

import { useEffect, useState } from "react";

export default function SettingsClient({
  organizationId,
}: {
  organizationId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ hasKey: boolean; last4: string | null } | null>(
    null,
  );

  async function load() {
    setError(null);
    const res = await fetch("/api/settings/api-key");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error || "Failed to load API key status");
      return;
    }
    setMeta({ hasKey: body.hasKey, last4: body.last4 ?? null });
  }

  useEffect(() => {
    void load();
  }, []);

  async function regenerate() {
    if (
      meta?.hasKey &&
      !confirm("Regenerate API key? Your old key will stop working.")
    )
      return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to generate API key");
        return;
      }
      setApiKey(body.apiKey);
      setMeta({ hasKey: true, last4: body.last4 ?? null });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Server API key (for Custom Conversion API)</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Required for server-to-server conversion tracking.
            </p>
          </div>
          <button
            disabled={loading}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            type="button"
            onClick={regenerate}
          >
            {meta?.hasKey ? "Regenerate" : "Generate"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 text-sm text-neutral-600">
          Status:{" "}
          {meta?.hasKey ? (
            <span>
              Active (last4: <span className="font-mono">{meta.last4}</span>)
            </span>
          ) : (
            <span>Not generated</span>
          )}
        </div>

        {apiKey ? (
          <div className="mt-4">
            <p className="text-sm text-neutral-600">
              Copy this key now. You won’t be able to see it again:
            </p>
            <code className="mt-2 block rounded-md border bg-neutral-50 px-3 py-2 text-xs">
              {apiKey}
            </code>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Custom Conversion API (fallback)</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Use when you can’t rely on Razorpay webhooks (COD, other gateways, SaaS, etc).
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Endpoint:</span>{" "}
            <code>/api/track/conversion</code>
          </div>
          <div>
            <span className="font-medium">Auth header:</span>{" "}
            <code>Authorization: Bearer &lt;API_KEY&gt;</code>
          </div>
          <div>
            <span className="font-medium">Attribution:</span>{" "}
            <code>ak_attrib</code> (preferred) or <code>refCode</code> or{" "}
            <code>visitorId</code>
          </div>
          <div>
            <span className="font-medium">Org:</span> pass{" "}
            <code>{organizationId}</code> only via API key (no body field needed).
          </div>
        </div>
      </section>
    </div>
  );
}


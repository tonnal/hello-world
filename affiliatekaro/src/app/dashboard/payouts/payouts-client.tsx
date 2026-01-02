"use client";

import { useState } from "react";

type OutstandingRow = {
  affiliateId: string;
  email: string;
  name: string | null;
  outstandingCount: number;
  outstandingAmount: string;
};

type PayoutRow = {
  id: string;
  affiliateEmail: string;
  amount: string;
  status: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
};

export default function PayoutsClient({
  outstanding,
  payouts,
}: {
  outstanding: OutstandingRow[];
  payouts: PayoutRow[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid(affiliateId: string) {
    const reference = prompt("Transaction reference (optional):") || "";
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, reference }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to create payout");
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Pending payouts</h2>
        <p className="mt-1 text-sm text-neutral-600">
          This pays <span className="font-medium">all approved unpaid</span>{" "}
          commissions for an affiliate.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">Affiliate</th>
                <th className="py-2 pr-3">Approved conversions</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-0 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={4}>
                    No pending payouts.
                  </td>
                </tr>
              ) : (
                outstanding.map((r) => (
                  <tr key={r.affiliateId} className="border-b">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.email}</div>
                      <div className="text-xs text-neutral-600">{r.name ?? ""}</div>
                    </td>
                    <td className="py-2 pr-3">{r.outstandingCount}</td>
                    <td className="py-2 pr-3">INR {r.outstandingAmount}</td>
                    <td className="py-2 pr-0 text-right">
                      <button
                        disabled={loading}
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                        type="button"
                        onClick={() => markPaid(r.affiliateId)}
                      >
                        Mark paid
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Payout history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Affiliate</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={5}>
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-3">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">{p.affiliateEmail}</td>
                    <td className="py-2 pr-3">INR {p.amount}</td>
                    <td className="py-2 pr-3">{p.reference ?? "-"}</td>
                    <td className="py-2 pr-0">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


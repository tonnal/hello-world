"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  createdAt: string;
  source: string;
  externalId: string;
  amount: string;
  currency: string;
  commissionAmount: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  refundedAt?: string | null;
  affiliateEmail: string;
  programName: string;
  payoutId: string | null;
  payoutStatus: string | null;
};

export default function ConversionsClient({ initial }: { initial: Row[] }) {
  const [items, setItems] = useState<Row[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => items, [items]);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/conversions");
      if (!res.ok) {
        setError("Failed to refresh");
        return;
      }
      const body = await res.json();
      setItems(body.conversions);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to update");
        return;
      }
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: body.conversion.status } : x)),
      );
    } finally {
      setLoading(false);
    }
  }

  async function refund(id: string) {
    const reason = prompt("Refund reason (optional):") || "";
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversions/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Failed to mark refunded");
        return;
      }
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "REJECTED" } : x)),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest conversions</h2>
        <button
          disabled={loading}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          type="button"
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-neutral-600">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">Program</th>
              <th className="py-2 pr-3">Affiliate</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Commission</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-neutral-600" colSpan={7}>
                  No conversions yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-3">
                    <div className="text-xs text-neutral-600">{r.source}</div>
                    <div>{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-neutral-600">{r.externalId}</div>
                  </td>
                  <td className="py-2 pr-3">{r.programName}</td>
                  <td className="py-2 pr-3">{r.affiliateEmail}</td>
                  <td className="py-2 pr-3">
                    {r.currency} {r.amount}
                  </td>
                  <td className="py-2 pr-3">
                    {r.currency} {r.commissionAmount}
                  </td>
                  <td className="py-2 pr-3">
                    {r.payoutId ? `PAID (${r.payoutStatus})` : r.status}
                    {r.refundedAt ? (
                      <div className="text-xs text-neutral-600">
                        refunded {new Date(r.refundedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-0 text-right">
                    <div className="flex justify-end gap-2">
                      {r.status === "PENDING" && !r.payoutId ? (
                        <>
                          <button
                            disabled={loading}
                            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                            type="button"
                            onClick={() => setStatus(r.id, "APPROVED")}
                          >
                            Approve
                          </button>
                          <button
                            disabled={loading}
                            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                            type="button"
                            onClick={() => setStatus(r.id, "REJECTED")}
                          >
                            Reject
                          </button>
                        </>
                      ) : r.status === "APPROVED" && !r.payoutId ? (
                        <button
                          disabled={loading}
                          className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                          type="button"
                          onClick={() => refund(r.id)}
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-500">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


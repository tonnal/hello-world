"use client";

import { useMemo, useState } from "react";

type Affiliate = {
  id: string;
  email: string;
  name: string | null;
  status: "INVITED" | "APPROVED" | "SUSPENDED" | "REJECTED";
  refCode: string;
  couponCode: string | null;
  createdAt: string;
};

export default function ProgramAffiliatesClient({
  programId,
  initial,
}: {
  programId: string;
  initial: Affiliate[];
}) {
  const [items, setItems] = useState<Affiliate[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/programs/${programId}/affiliates`);
      if (!res.ok) {
        setError("Failed to refresh");
        return;
      }
      const body = await res.json();
      setItems(body.affiliates);
    } finally {
      setLoading(false);
    }
  }

  async function onInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/programs/${programId}/affiliates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(fd.get("email") || ""),
          name: String(fd.get("name") || ""),
          couponCode: String(fd.get("couponCode") || ""),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to create affiliate");
        return;
      }
      const body = await res.json();
      setItems((prev) => [body.affiliate, ...prev]);
      e.currentTarget.reset();
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: Affiliate["status"]) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/affiliates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to update status");
        return;
      }
      const body = await res.json();
      setItems((prev) => prev.map((x) => (x.id === id ? body.affiliate : x)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-lg border p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Invite affiliate</h2>
        <form className="mt-4 space-y-3" onSubmit={onInvite}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border px-3 py-2"
              placeholder="creator@gmail.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Name (optional)</label>
            <input
              name="name"
              className="w-full rounded-md border px-3 py-2"
              placeholder="Creator name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Coupon code (optional)</label>
            <input
              name="couponCode"
              className="w-full rounded-md border px-3 py-2"
              placeholder="SAVE10"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="submit"
          >
            {loading ? "Saving..." : "Create invite"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Affiliates</h2>
          <button
            disabled={loading}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            type="button"
            onClick={refresh}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Ref link</th>
                <th className="py-2 pr-3">Coupon</th>
                <th className="py-2 pr-0 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={5}>
                    No affiliates yet.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{a.email}</div>
                      <div className="text-xs text-neutral-600">
                        {a.name ?? ""}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{a.status}</td>
                    <td className="py-2 pr-3">
                      <code className="text-xs">
                        {baseLink ? `${baseLink}/?ref=${a.refCode}` : a.refCode}
                      </code>
                    </td>
                    <td className="py-2 pr-3">{a.couponCode ?? "-"}</td>
                    <td className="py-2 pr-0 text-right">
                      <div className="flex justify-end gap-2">
                        {a.status !== "APPROVED" ? (
                          <button
                            disabled={loading}
                            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                            type="button"
                            onClick={() => setStatus(a.id, "APPROVED")}
                          >
                            Approve
                          </button>
                        ) : null}
                        {a.status !== "SUSPENDED" ? (
                          <button
                            disabled={loading}
                            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                            type="button"
                            onClick={() => setStatus(a.id, "SUSPENDED")}
                          >
                            Suspend
                          </button>
                        ) : null}
                        <button
                          disabled={loading}
                          className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                          type="button"
                          onClick={() => setStatus(a.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
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


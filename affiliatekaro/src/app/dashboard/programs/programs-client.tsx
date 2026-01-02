"use client";

import { useMemo, useState } from "react";

type Program = {
  id: string;
  name: string;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: string;
  cookieDays: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export default function ProgramsClient({
  initialPrograms,
}: {
  initialPrograms: Program[];
}) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => programs, [programs]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        name: String(fd.get("name") || ""),
        commissionType: String(fd.get("commissionType") || "PERCENTAGE"),
        commissionValue: String(fd.get("commissionValue") || ""),
        cookieDays: Number(fd.get("cookieDays") || 30),
        status: String(fd.get("status") || "ACTIVE"),
      };

      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to create program");
        return;
      }

      const body = await res.json();
      setPrograms((p) => [body.program, ...p]);
      e.currentTarget.reset();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this program?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to delete program");
        return;
      }
      setPrograms((p) => p.filter((x) => x.id !== id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-lg border p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Create program</h2>
        <form className="mt-4 space-y-3" onSubmit={onCreate}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-md border px-3 py-2"
              placeholder="Influencer program"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Commission type</label>
              <select
                name="commissionType"
                className="w-full rounded-md border px-3 py-2"
                defaultValue="PERCENTAGE"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Commission value</label>
              <input
                name="commissionValue"
                required
                className="w-full rounded-md border px-3 py-2"
                placeholder="e.g. 10 or 100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cookie duration</label>
              <select
                name="cookieDays"
                className="w-full rounded-md border px-3 py-2"
                defaultValue="30"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                className="w-full rounded-md border px-3 py-2"
                defaultValue="ACTIVE"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
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
            {loading ? "Saving..." : "Create"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your programs</h2>
          <button
            disabled={loading}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            type="button"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const res = await fetch("/api/programs");
                if (!res.ok) {
                  setError("Failed to refresh");
                  return;
                }
                const body = await res.json();
                setPrograms(body.programs);
              } finally {
                setLoading(false);
              }
            }}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Commission</th>
                <th className="py-2 pr-3">Cookie</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-0 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={5}>
                    No programs yet.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3">
                      {p.commissionType === "PERCENTAGE" ? "" : "₹"}
                      {String(p.commissionValue)}
                      {p.commissionType === "PERCENTAGE" ? "%" : ""}
                    </td>
                    <td className="py-2 pr-3">{p.cookieDays}d</td>
                    <td className="py-2 pr-3">{p.status}</td>
                    <td className="py-2 pr-0 text-right">
                      <button
                        disabled={loading}
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                        type="button"
                        onClick={() => onDelete(p.id)}
                      >
                        Delete
                      </button>
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


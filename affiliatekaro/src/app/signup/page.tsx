"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: String(fd.get("organizationName") || ""),
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          password: String(fd.get("password") || ""),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Signup failed");
        return;
      }

      router.push("/login?signup=1");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Create your merchant account</h1>
        <p className="text-sm text-neutral-600">
          Start by creating your organization (1 merchant = 1 organization).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Organization name</label>
          <input
            name="organizationName"
            required
            className="w-full rounded-md border px-3 py-2"
            placeholder="Acme D2C"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Your name (optional)</label>
          <input
            name="name"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Founder name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border px-3 py-2"
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border px-3 py-2"
            placeholder="At least 8 characters"
            autoComplete="new-password"
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
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-neutral-600">
        Already have an account?{" "}
        <Link className="underline" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}


import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/app/dashboard/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold">
            AffiliateKaro
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-3 text-sm text-neutral-700 md:flex">
              <Link className="underline-offset-4 hover:underline" href="/dashboard">
                Overview
              </Link>
              <Link className="underline-offset-4 hover:underline" href="/dashboard/programs">
                Programs
              </Link>
              <Link className="underline-offset-4 hover:underline" href="/dashboard/conversions">
                Conversions
              </Link>
              <Link className="underline-offset-4 hover:underline" href="/dashboard/payouts">
                Payouts
              </Link>
            </nav>
            <span className="text-sm text-neutral-600">
              {session?.user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}


import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/plans";

export default async function DashboardHome() {
  const session = await requireSession();
  const { start, end } = monthRange();

  const [
    clickCount,
    convByStatus,
    gmvAgg,
    pendingAgg,
    approvedAgg,
    paidAgg,
  ] = await Promise.all([
    prisma.referral.count({
      where: { organizationId: session.organizationId, createdAt: { gte: start, lt: end } },
    }),
    prisma.conversion.groupBy({
      by: ["status"],
      where: { organizationId: session.organizationId, createdAt: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    prisma.conversion.aggregate({
      where: { organizationId: session.organizationId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.conversion.aggregate({
      where: {
        organizationId: session.organizationId,
        createdAt: { gte: start, lt: end },
        status: "PENDING",
      },
      _sum: { commissionAmount: true },
    }),
    prisma.conversion.aggregate({
      where: {
        organizationId: session.organizationId,
        createdAt: { gte: start, lt: end },
        status: "APPROVED",
      },
      _sum: { commissionAmount: true },
    }),
    prisma.conversion.aggregate({
      where: {
        organizationId: session.organizationId,
        createdAt: { gte: start, lt: end },
        status: "PAID",
      },
      _sum: { commissionAmount: true },
    }),
  ]);

  const convCounts = Object.fromEntries(
    convByStatus.map((r) => [r.status, r._count._all]),
  ) as Record<string, number>;

  const gmv = (gmvAgg._sum.amount ?? new Prisma.Decimal(0)).toString();
  const pending = (pendingAgg._sum.commissionAmount ?? new Prisma.Decimal(0)).toString();
  const approved = (approvedAgg._sum.commissionAmount ?? new Prisma.Decimal(0)).toString();
  const paid = (paidAgg._sum.commissionAmount ?? new Prisma.Decimal(0)).toString();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-neutral-600">
          Month to date: {start.toLocaleDateString()} → {new Date(end.getTime() - 1).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-neutral-600">Clicks</div>
          <div className="text-2xl font-semibold">{clickCount}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-neutral-600">Conversions</div>
          <div className="text-2xl font-semibold">
            {(convCounts.PENDING ?? 0) +
              (convCounts.APPROVED ?? 0) +
              (convCounts.PAID ?? 0) +
              (convCounts.REJECTED ?? 0)}
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            P: {convCounts.PENDING ?? 0} · A: {convCounts.APPROVED ?? 0} · Paid:{" "}
            {convCounts.PAID ?? 0} · R: {convCounts.REJECTED ?? 0}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-neutral-600">GMV</div>
          <div className="text-2xl font-semibold">INR {gmv}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-neutral-600">Commissions</div>
          <div className="mt-1 grid grid-cols-1 gap-1 text-sm">
            <div>
              <span className="text-neutral-600">Pending:</span> INR {pending}
            </div>
            <div>
              <span className="text-neutral-600">Approved:</span> INR {approved}
            </div>
            <div>
              <span className="text-neutral-600">Paid:</span> INR {paid}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/dashboard/programs">
          Manage programs
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/dashboard/conversions">
          Review conversions
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/dashboard/payouts">
          Manage payouts
        </Link>
      </div>
    </div>
  );
}


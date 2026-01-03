import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import PayoutsClient from "@/app/dashboard/payouts/payouts-client";

export default async function PayoutsPage() {
  const session = await requireSession();

  const affiliates = await prisma.affiliate.findMany({
    where: { organizationId: session.organizationId },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const outstandingByAffiliate = await prisma.conversion.groupBy({
    by: ["affiliateId"],
    where: {
      organizationId: session.organizationId,
      status: "APPROVED",
      payoutId: null,
    },
    _sum: { commissionAmount: true },
    _count: { _all: true },
  });

  const map = new Map(
    outstandingByAffiliate.map((r) => [
      r.affiliateId,
      {
        count: r._count._all,
        amount: (r._sum.commissionAmount ?? new Prisma.Decimal(0)).toString(),
      },
    ]),
  );

  const outstanding = affiliates
    .map((a) => ({
      affiliateId: a.id,
      email: a.email,
      name: a.name,
      outstandingCount: map.get(a.id)?.count ?? 0,
      outstandingAmount: map.get(a.id)?.amount ?? "0",
    }))
    .filter((r) => r.outstandingCount > 0);

  const payouts = await prisma.payout.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    include: { affiliate: { select: { email: true } } },
    take: 100,
  });

  const safePayouts = payouts.map((p) => ({
    id: p.id,
    affiliateEmail: p.affiliate.email,
    amount: p.amount.toString(),
    status: p.status,
    reference: p.reference,
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="text-sm text-neutral-600">
          Mark approved commissions as paid (manual payout in MVP).
        </p>
      </div>
      <PayoutsClient outstanding={outstanding} payouts={safePayouts} />
    </div>
  );
}


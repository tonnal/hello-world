import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import ConversionsClient from "@/app/dashboard/conversions/conversions-client";

export default async function ConversionsPage() {
  const session = await requireSession();

  const conversions = await prisma.conversion.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      affiliate: { select: { email: true } },
      program: { select: { name: true } },
      payout: { select: { id: true, status: true } },
    },
    take: 200,
  });

  const safe = conversions.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    source: c.source,
    externalId: c.externalId,
    amount: c.amount.toString(),
    currency: c.currency,
    commissionAmount: c.commissionAmount.toString(),
    status: c.status,
    refundedAt: c.refundedAt?.toISOString() ?? null,
    affiliateEmail: c.affiliate.email,
    programName: c.program.name,
    payoutId: c.payout?.id ?? null,
    payoutStatus: c.payout?.status ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Conversions</h1>
        <p className="text-sm text-neutral-600">
          Review conversions from Razorpay and approve commissions.
        </p>
      </div>
      <ConversionsClient initial={safe} />
    </div>
  );
}


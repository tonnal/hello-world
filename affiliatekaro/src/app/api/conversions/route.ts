import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const conversions = await prisma.conversion.findMany({
    where: { organizationId: auth.session.organizationId },
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

  return NextResponse.json({ conversions: safe });
}


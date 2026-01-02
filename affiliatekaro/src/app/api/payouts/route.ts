import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";
import { Prisma } from "@prisma/client";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const affiliates = await prisma.affiliate.findMany({
    where: { organizationId: auth.session.organizationId },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  // Outstanding = approved conversions not yet linked to a payout
  const outstandingByAffiliate = await prisma.conversion.groupBy({
    by: ["affiliateId"],
    where: {
      organizationId: auth.session.organizationId,
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

  const rows = affiliates.map((a) => ({
    affiliateId: a.id,
    email: a.email,
    name: a.name,
    outstandingCount: map.get(a.id)?.count ?? 0,
    outstandingAmount: map.get(a.id)?.amount ?? "0",
  }));

  const payouts = await prisma.payout.findMany({
    where: { organizationId: auth.session.organizationId },
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

  return NextResponse.json({ outstanding: rows, payouts: safePayouts });
}

const CreatePayoutSchema = z.object({
  affiliateId: z.string().uuid(),
  reference: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = CreatePayoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Compute all approved unpaid conversions
  const conversions = await prisma.conversion.findMany({
    where: {
      organizationId: auth.session.organizationId,
      affiliateId: parsed.data.affiliateId,
      status: "APPROVED",
      payoutId: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, commissionAmount: true },
  });

  if (conversions.length === 0) {
    return NextResponse.json({ error: "No outstanding commissions" }, { status: 400 });
  }

  const total = conversions.reduce(
    (acc, c) => acc.add(c.commissionAmount),
    new Prisma.Decimal(0),
  );

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.payout.create({
      data: {
        organizationId: auth.session.organizationId,
        affiliateId: parsed.data.affiliateId,
        amount: total,
        status: "PAID",
        reference: parsed.data.reference?.trim() || null,
        paidAt: new Date(),
      },
    });

    await tx.conversion.updateMany({
      where: { id: { in: conversions.map((c) => c.id) } },
      data: { status: "PAID", payoutId: created.id },
    });

    return created;
  });

  return NextResponse.json({ payoutId: payout.id });
}


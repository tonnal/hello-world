import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";

const RefundSchema = z.object({
  reason: z.string().min(1).max(200).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = RefundSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.conversion.findFirst({
    where: { id, organizationId: auth.session.organizationId },
    select: { id: true, status: true, payoutId: true, refundedAt: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // MVP rule: if already paid out, refund must be handled manually outside the system.
  if (existing.payoutId) {
    return NextResponse.json(
      { error: "This conversion is already paid out. Handle refund manually." },
      { status: 409 },
    );
  }

  if (existing.refundedAt) {
    return NextResponse.json({ ok: true, alreadyRefunded: true });
  }

  const updated = await prisma.conversion.update({
    where: { id },
    data: {
      status: "REJECTED",
      refundedAt: new Date(),
      refundReason: parsed.data.reason?.trim() || "Refunded",
    },
  });

  return NextResponse.json({
    ok: true,
    conversion: { id: updated.id, status: updated.status },
  });
}


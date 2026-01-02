import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";

const UpdateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.conversion.findFirst({
    where: { id, organizationId: auth.session.organizationId },
    select: { id: true, status: true, payoutId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.payoutId) {
    return NextResponse.json({ error: "Already paid out" }, { status: 409 });
  }

  const updated = await prisma.conversion.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({
    conversion: {
      id: updated.id,
      status: updated.status,
    },
  });
}


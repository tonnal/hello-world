import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";

const UpdateAffiliateSchema = z.object({
  status: z.enum(["INVITED", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
  name: z.string().min(1).max(100).optional().nullable(),
  couponCode: z.string().min(1).max(64).optional().nullable(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = UpdateAffiliateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.affiliate.findFirst({
    where: { id, organizationId: auth.session.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.affiliate.update({
    where: { id },
    data: {
      status: parsed.data.status,
      name:
        parsed.data.name === undefined
          ? undefined
          : parsed.data.name
            ? parsed.data.name.trim()
            : null,
      couponCode:
        parsed.data.couponCode === undefined
          ? undefined
          : parsed.data.couponCode
            ? parsed.data.couponCode.trim()
            : null,
    },
  });

  return NextResponse.json({ affiliate: updated });
}


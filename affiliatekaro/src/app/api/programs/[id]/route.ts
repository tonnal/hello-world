import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";
import { Prisma } from "@prisma/client";

const UpdateProgramSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  commissionValue: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Number(v)), "Must be a number")
    .optional(),
  cookieDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const program = await prisma.program.findFirst({
    where: { id, organizationId: auth.session.organizationId },
  });

  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ program });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = UpdateProgramSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.program.findFirst({
    where: { id, organizationId: auth.session.organizationId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.program.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      commissionType: parsed.data.commissionType,
      commissionValue:
        parsed.data.commissionValue != null
          ? new Prisma.Decimal(parsed.data.commissionValue)
          : undefined,
      cookieDays: parsed.data.cookieDays,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ program: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const existing = await prisma.program.findFirst({
    where: { id, organizationId: auth.session.organizationId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.program.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


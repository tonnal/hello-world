import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";
import { Prisma } from "@prisma/client";

const CreateProgramSchema = z.object({
  name: z.string().min(2).max(100),
  commissionType: z.enum(["PERCENTAGE", "FIXED"]),
  commissionValue: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Number(v)), "Must be a number"),
  cookieDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const programs = await prisma.program.findMany({
    where: { organizationId: auth.session.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ programs });
}

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const json = await req.json().catch(() => null);
  const parsed = CreateProgramSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const created = await prisma.program.create({
    data: {
      organizationId: auth.session.organizationId,
      name: parsed.data.name.trim(),
      commissionType: parsed.data.commissionType,
      commissionValue: new Prisma.Decimal(parsed.data.commissionValue),
      cookieDays: parsed.data.cookieDays,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ program: created }, { status: 201 });
}


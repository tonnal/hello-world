import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";
import { generateRefCode } from "@/lib/ref-code";
import { PLAN_LIMITS } from "@/lib/plans";

const CreateAffiliateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  couponCode: z.string().min(1).max(64).optional(),
});

async function requireProgramForOrg(programId: string, organizationId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, organizationId },
    select: { id: true, organizationId: true },
  });
  return program;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ programId: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { programId } = await ctx.params;
  const program = await requireProgramForOrg(programId, auth.session.organizationId);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const affiliates = await prisma.affiliate.findMany({
    where: { organizationId: auth.session.organizationId, programId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ affiliates });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ programId: string }> },
) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const { programId } = await ctx.params;
  const program = await requireProgramForOrg(programId, auth.session.organizationId);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const org = await prisma.organization.findUnique({
    where: { id: auth.session.organizationId },
    select: { plan: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limits = PLAN_LIMITS[org.plan];
  if (limits.maxAffiliates != null) {
    const count = await prisma.affiliate.count({
      where: { organizationId: auth.session.organizationId, status: { not: "REJECTED" } },
    });
    if (count >= limits.maxAffiliates) {
      return NextResponse.json(
        { error: "Affiliate limit reached for your plan" },
        { status: 403 },
      );
    }
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateAffiliateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Generate unique refCode per program.
  let refCode = generateRefCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.affiliate.findFirst({
      where: { programId, refCode },
      select: { id: true },
    });
    if (!exists) break;
    refCode = generateRefCode();
  }

  const created = await prisma.affiliate.create({
    data: {
      organizationId: auth.session.organizationId,
      programId,
      email,
      name: parsed.data.name?.trim() || null,
      couponCode: parsed.data.couponCode?.trim() || null,
      // status defaults to INVITED
      refCode,
    },
  });

  return NextResponse.json({ affiliate: created }, { status: 201 });
}


import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).max(100),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid signup payload" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const created = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName.trim(),
      users: {
        create: {
          email,
          name: parsed.data.name?.trim() || null,
          passwordHash,
        },
      },
    },
    include: { users: true },
  });

  return NextResponse.json({
    organizationId: created.id,
    userId: created.users[0]!.id,
  });
}


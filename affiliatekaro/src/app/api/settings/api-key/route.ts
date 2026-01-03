import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/app/api/_utils";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: auth.session.organizationId },
    select: { apiKeyLast4: true, apiKeyCreatedAt: true, apiKeyHash: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json({
    hasKey: Boolean(org.apiKeyHash),
    last4: org.apiKeyLast4,
    createdAt: org.apiKeyCreatedAt?.toISOString() ?? null,
  });
}

export async function POST() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const apiKey = generateApiKey();
  const hash = hashApiKey(apiKey);
  const last4 = apiKey.slice(-4);

  await prisma.organization.update({
    where: { id: auth.session.organizationId },
    data: {
      apiKeyHash: hash,
      apiKeyLast4: last4,
      apiKeyCreatedAt: new Date(),
    },
  });

  // Return plaintext key once (merchant must store it).
  return NextResponse.json({ apiKey, last4 });
}


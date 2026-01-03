import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-key";
import { PLAN_LIMITS, monthRange } from "@/lib/plans";

export const runtime = "nodejs";

const ConversionSchema = z.object({
  externalId: z.string().min(3).max(100),
  amount: z.number().positive(), // in currency units (INR for MVP)
  currency: z.string().min(3).max(8).default("INR"),
  customerEmail: z.string().email().optional(),
  // Attribution options:
  ak_attrib: z.string().min(10).max(200).optional(), // "affiliateId.programId.timestamp"
  refCode: z.string().min(3).max(32).optional(),
  visitorId: z.string().min(8).max(64).optional(),
});

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1]!.trim() : null;
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? null;
}

type RateState = { windowStart: number; count: number };
declare global {
  var __convRate: Map<string, RateState> | undefined;
}

function rateLimit(ip: string | null) {
  if (!ip) return true;
  const now = Date.now();
  const map = globalThis.__convRate ?? new Map<string, RateState>();
  globalThis.__convRate = map;

  const windowMs = 60_000;
  const max = 120; // 120/min per IP (server-to-server)

  const state = map.get(ip);
  if (!state || now - state.windowStart > windowMs) {
    map.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (state.count >= max) return false;
  state.count += 1;
  map.set(ip, state);
  return true;
}

function parseAttrib(cookieValue: string) {
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [affiliateId, programId, tsRaw] = parts;
  const ts = Number(tsRaw);
  if (!affiliateId || !programId || !Number.isFinite(ts)) return null;
  return { affiliateId, programId, ts };
}

export async function POST(req: Request) {
  if (!rateLimit(getIp(req))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const apiKey = getBearer(req);
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  const apiKeyHash = hashApiKey(apiKey);
  const org = await prisma.organization.findUnique({
    where: { apiKeyHash },
    select: { id: true, plan: true },
  });
  if (!org) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = ConversionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const currency = parsed.data.currency.toUpperCase();
  if (currency !== "INR") {
    return NextResponse.json({ error: "Only INR supported for MVP" }, { status: 400 });
  }

  // Attribution resolution
  const attribRaw = parsed.data.ak_attrib || "";
  const refCodeRaw = parsed.data.refCode || "";
  const visitorIdRaw = parsed.data.visitorId || "";

  let referralId: string | null = null;
  let affiliate:
    | {
        id: string;
        email: string;
        organizationId: string;
        programId: string;
        program: {
          id: string;
          cookieDays: number;
          commissionType: "PERCENTAGE" | "FIXED";
          commissionValue: Prisma.Decimal;
          status: "ACTIVE" | "INACTIVE";
        };
      }
    | null = null;

  const parsedAttrib = attribRaw ? parseAttrib(attribRaw) : null;
  if (parsedAttrib) {
    affiliate = await prisma.affiliate.findFirst({
      where: {
        id: parsedAttrib.affiliateId,
        programId: parsedAttrib.programId,
        organizationId: org.id,
        status: "APPROVED",
        program: { status: "ACTIVE" },
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        programId: true,
        program: {
          select: {
            id: true,
            cookieDays: true,
            commissionType: true,
            commissionValue: true,
            status: true,
          },
        },
      },
    });

    if (affiliate) {
      const ageMs = Date.now() - parsedAttrib.ts;
      const maxMs = affiliate.program.cookieDays * 864e5;
      if (ageMs < 0 || ageMs > maxMs) affiliate = null;
    }
  }

  if (!affiliate && refCodeRaw) {
    const refCode = refCodeRaw.trim().toUpperCase();
    affiliate = await prisma.affiliate.findFirst({
      where: {
        organizationId: org.id,
        refCode,
        status: "APPROVED",
        program: { status: "ACTIVE" },
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        programId: true,
        program: {
          select: {
            id: true,
            cookieDays: true,
            commissionType: true,
            commissionValue: true,
            status: true,
          },
        },
      },
    });
  }

  if (!affiliate && visitorIdRaw) {
    const visitorId = visitorIdRaw.trim();
    const latestReferral = await prisma.referral.findFirst({
      where: { organizationId: org.id, visitorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        affiliate: {
          select: {
            id: true,
            email: true,
            organizationId: true,
            programId: true,
            status: true,
            program: {
              select: {
                id: true,
                cookieDays: true,
                commissionType: true,
                commissionValue: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (
      latestReferral?.affiliate?.status === "APPROVED" &&
      latestReferral.affiliate.program.status === "ACTIVE"
    ) {
      const ageMs = Date.now() - latestReferral.createdAt.getTime();
      const maxMs = latestReferral.affiliate.program.cookieDays * 864e5;
      if (ageMs >= 0 && ageMs <= maxMs) {
        referralId = latestReferral.id;
        affiliate = {
          id: latestReferral.affiliate.id,
          email: latestReferral.affiliate.email,
          organizationId: latestReferral.affiliate.organizationId,
          programId: latestReferral.affiliate.programId,
          program: latestReferral.affiliate.program,
        };
      }
    }
  }

  if (!affiliate) {
    return NextResponse.json(
      { error: "Unable to attribute conversion (ak_attrib/refCode/visitorId required)" },
      { status: 400 },
    );
  }

  // Self-referral block (basic)
  if (parsed.data.customerEmail) {
    const buyer = parsed.data.customerEmail.toLowerCase().trim();
    if (buyer === affiliate.email) {
      return NextResponse.json({ ok: true, skipped: "self_referral" });
    }
  }

  const amount = new Prisma.Decimal(parsed.data.amount);

  const commissionType = affiliate.program.commissionType;
  const commissionValue = affiliate.program.commissionValue;
  let commissionAmount = new Prisma.Decimal(0);
  if (commissionType === "PERCENTAGE") {
    commissionAmount = amount.mul(commissionValue).div(100);
  } else {
    commissionAmount = commissionValue;
  }

  if (commissionAmount.lessThan(0)) commissionAmount = new Prisma.Decimal(0);
  if (commissionAmount.greaterThan(amount)) commissionAmount = amount;

  // Plan cap (monthly GMV)
  const limits = PLAN_LIMITS[org.plan];
  if (limits.monthlyGmvCapInr != null) {
    const { start, end } = monthRange();
    const agg = await prisma.conversion.aggregate({
      where: { organizationId: org.id, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    const current = agg._sum.amount ?? new Prisma.Decimal(0);
    const next = current.add(amount);
    if (next.greaterThan(new Prisma.Decimal(limits.monthlyGmvCapInr))) {
      commissionAmount = new Prisma.Decimal(0);
    }
  }

  try {
    const conversion = await prisma.conversion.create({
      data: {
        organizationId: org.id,
        programId: affiliate.programId,
        affiliateId: affiliate.id,
        referralId,
        source: "api",
        externalId: parsed.data.externalId,
        amount,
        currency,
        commissionType,
        commissionValue,
        commissionAmount,
        status: commissionAmount.equals(0) ? "REJECTED" : "PENDING",
      },
    });
    return NextResponse.json({ ok: true, conversionId: conversion.id });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }
}


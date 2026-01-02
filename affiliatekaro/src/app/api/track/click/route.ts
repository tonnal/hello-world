import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ClickSchema = z.object({
  ref: z.string().min(3).max(32),
  url: z.string().url().max(2000),
  visitorId: z.string().min(8).max(64).optional(),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? null;
}

type RateState = { windowStart: number; count: number };
declare global {
  var __trackRate: Map<string, RateState> | undefined;
}

function rateLimit(ip: string | null) {
  if (!ip) return true;
  const now = Date.now();
  const map = globalThis.__trackRate ?? new Map<string, RateState>();
  globalThis.__trackRate = map;

  const windowMs = 60_000;
  const max = 60; // 60 clicks/minute per IP

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  if (!rateLimit(getIp(req))) {
    return NextResponse.json(
      { error: "Rate limited" },
      { status: 429, headers: corsHeaders() },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = ClickSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const refCode = parsed.data.ref.trim().toUpperCase();

  // For MVP: only track clicks for APPROVED affiliates + ACTIVE programs.
  const affiliate = await prisma.affiliate.findFirst({
    where: { refCode, status: "APPROVED", program: { status: "ACTIVE" } },
    select: {
      id: true,
      organizationId: true,
      programId: true,
      program: { select: { cookieDays: true } },
    },
  });

  if (!affiliate) {
    return NextResponse.json(
      { error: "Unknown ref" },
      { status: 404, headers: corsHeaders() },
    );
  }

  await prisma.referral.create({
    data: {
      organizationId: affiliate.organizationId,
      programId: affiliate.programId,
      affiliateId: affiliate.id,
      landingUrl: parsed.data.url,
      refCode,
      visitorId: parsed.data.visitorId,
      ip: getIp(req),
      userAgent: req.headers.get("user-agent"),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      affiliateId: affiliate.id,
      programId: affiliate.programId,
      cookieDays: affiliate.program.cookieDays,
    },
    { headers: corsHeaders() },
  );
}


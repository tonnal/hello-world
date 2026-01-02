import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id?: string | null;
        amount: number; // in paise
        currency: string;
        email?: string | null;
        notes?: Record<string, string>;
      };
    };
  };
};

function parseAttributionCookie(cookieValue: string) {
  // ak_attrib = affiliateId.programId.timestamp
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [affiliateId, programId, tsRaw] = parts;
  const ts = Number(tsRaw);
  if (!affiliateId || !programId || !Number.isFinite(ts)) return null;
  return { affiliateId, programId, ts };
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RAZORPAY_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const evt = JSON.parse(raw) as RazorpayEvent;

  // MVP: treat payment.captured as the conversion source of truth.
  if (evt.event !== "payment.captured") {
    return NextResponse.json({ ok: true });
  }

  const payment = evt.payload?.payment?.entity;
  if (!payment?.id) return NextResponse.json({ error: "Bad payload" }, { status: 400 });

  const notes = payment.notes ?? {};
  const organizationId =
    notes.ak_org || notes.organization_id || notes.org_id || notes.orgId;
  if (!organizationId) {
    return NextResponse.json(
      { error: "Missing organization id in notes (ak_org)" },
      { status: 400 },
    );
  }

  // Attribution options:
  // - notes.ak_attrib = "affiliateId.programId.timestamp" (preferred)
  // - notes.ak_ref / notes.ref = refCode (fallback)
  const attribRaw = notes.ak_attrib || notes.akAttrib || "";
  const refRaw = notes.ak_ref || notes.ref || notes.via || "";

  let affiliateId: string | null = null;
  let programId: string | null = null;
  let attributionTs: number | null = null;

  const parsedAttrib = attribRaw ? parseAttributionCookie(attribRaw) : null;
  if (parsedAttrib) {
    affiliateId = parsedAttrib.affiliateId;
    programId = parsedAttrib.programId;
    attributionTs = parsedAttrib.ts;
  }

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

  if (affiliateId && programId) {
    affiliate = await prisma.affiliate.findFirst({
      where: {
        id: affiliateId,
        programId,
        organizationId,
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

    // Validate within cookie window (timestamp comes from merchant-side cookie write).
    if (affiliate && attributionTs) {
      const ageMs = Date.now() - attributionTs;
      const maxMs = affiliate.program.cookieDays * 864e5;
      if (ageMs < 0 || ageMs > maxMs) {
        affiliate = null;
      }
    }
  }

  if (!affiliate && refRaw) {
    const refCode = refRaw.trim().toUpperCase();
    affiliate = await prisma.affiliate.findFirst({
      where: {
        refCode,
        organizationId,
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

  if (!affiliate) {
    return NextResponse.json(
      { error: "Unable to attribute conversion (missing/invalid ak_attrib or ref)" },
      { status: 400 },
    );
  }

  // Self-referral block (basic): if buyer email matches affiliate email, reject.
  if (payment.email && payment.email.toLowerCase().trim() === affiliate.email) {
    return NextResponse.json({ ok: true, skipped: "self_referral" });
  }

  const amount = new Prisma.Decimal(payment.amount).div(100); // paise -> INR
  const currency = payment.currency || "INR";

  const commissionType = affiliate.program.commissionType;
  const commissionValue = affiliate.program.commissionValue;

  let commissionAmount = new Prisma.Decimal(0);
  if (commissionType === "PERCENTAGE") {
    commissionAmount = amount.mul(commissionValue).div(100);
  } else {
    commissionAmount = commissionValue;
  }

  // Guardrails
  if (commissionAmount.lessThan(0)) commissionAmount = new Prisma.Decimal(0);
  if (commissionAmount.greaterThan(amount)) commissionAmount = amount;

  try {
    const conversion = await prisma.conversion.create({
      data: {
        organizationId: affiliate.organizationId,
        programId: affiliate.programId,
        affiliateId: affiliate.id,
        referralId: null,
        source: "razorpay",
        externalId: payment.id, // idempotency key
        amount,
        currency,
        commissionType,
        commissionValue,
        commissionAmount,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, conversionId: conversion.id });
  } catch (e: unknown) {
    // Idempotency: duplicate webhook delivery should not create duplicate conversions
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }
}


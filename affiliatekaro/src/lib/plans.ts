export type PlanName = "FREE" | "STARTER" | "GROWTH";

export type PlanLimits = {
  maxAffiliates: number | null; // null = unlimited
  monthlyGmvCapInr: number | null; // null = unlimited
};

// MVP defaults (edit later).
export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  FREE: {
    maxAffiliates: 2,
    monthlyGmvCapInr: 50_000,
  },
  STARTER: {
    maxAffiliates: 25,
    monthlyGmvCapInr: 500_000,
  },
  GROWTH: {
    maxAffiliates: null,
    monthlyGmvCapInr: null,
  },
};

export function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}


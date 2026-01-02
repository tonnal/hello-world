import { prisma } from "@/lib/prisma";

export default async function AffiliatePortalPage({
  params,
}: {
  params: Promise<{ refCode: string }>;
}) {
  const { refCode } = await params;
  const code = refCode.trim().toUpperCase();

  const affiliate = await prisma.affiliate.findFirst({
    where: { refCode: code, status: "APPROVED", program: { status: "ACTIVE" } },
    include: {
      program: { select: { name: true } },
      conversions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          amount: true,
          currency: true,
          commissionAmount: true,
          status: true,
        },
      },
      payouts: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          amount: true,
          status: true,
          reference: true,
          paidAt: true,
        },
      },
    },
  });

  if (!affiliate) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Affiliate portal</h1>
        <p className="mt-2 text-sm text-neutral-600">Affiliate not found.</p>
      </main>
    );
  }

  const conversions = affiliate.conversions.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    amount: c.amount.toString(),
    commissionAmount: c.commissionAmount.toString(),
  }));

  const payouts = affiliate.payouts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    amount: p.amount.toString(),
  }));

  const totalEarned = conversions
    .filter((c) => c.status === "APPROVED" || c.status === "PAID")
    .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

  const totalPaid = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Affiliate portal</h1>
        <p className="text-sm text-neutral-600">
          Program: <span className="font-medium">{affiliate.program.name}</span>
        </p>
        <p className="text-sm text-neutral-600">
          Your code: <span className="font-mono">{affiliate.refCode}</span>
        </p>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Your link</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Share this link with your audience:
        </p>
        <code className="mt-2 block rounded-md border bg-neutral-50 px-3 py-2 text-xs">
          {"https://MERCHANT_SITE/?ref="}
          {affiliate.refCode}
        </code>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-neutral-600">Earned</div>
            <div className="text-lg font-semibold">INR {totalEarned.toFixed(2)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-neutral-600">Paid</div>
            <div className="text-lg font-semibold">INR {totalPaid.toFixed(2)}</div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Recent conversions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Commission</th>
                <th className="py-2 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {conversions.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={4}>
                    No conversions yet.
                  </td>
                </tr>
              ) : (
                conversions.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 pr-3">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {c.currency} {c.amount}
                    </td>
                    <td className="py-2 pr-3">
                      {c.currency} {c.commissionAmount}
                    </td>
                    <td className="py-2 pr-0">{c.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Payout history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td className="py-4 text-neutral-600" colSpan={4}>
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-3">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">INR {p.amount}</td>
                    <td className="py-2 pr-3">{p.reference ?? "-"}</td>
                    <td className="py-2 pr-0">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


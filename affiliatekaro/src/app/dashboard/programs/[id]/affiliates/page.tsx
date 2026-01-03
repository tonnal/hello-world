import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import ProgramAffiliatesClient from "@/app/dashboard/programs/[id]/affiliates/program-affiliates-client";

export default async function ProgramAffiliatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const program = await prisma.program.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!program) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Affiliates</h1>
        <p className="text-sm text-neutral-600">Program not found.</p>
      </div>
    );
  }

  const affiliates = await prisma.affiliate.findMany({
    where: { organizationId: session.organizationId, programId: program.id },
    orderBy: { createdAt: "desc" },
  });

  const safeAffiliates = affiliates.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    status: a.status,
    refCode: a.refCode,
    couponCode: a.couponCode,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Affiliates</h1>
        <p className="text-sm text-neutral-600">
          Program: <span className="font-medium">{program.name}</span>
        </p>
      </div>

      <ProgramAffiliatesClient programId={program.id} initial={safeAffiliates} />
    </div>
  );
}


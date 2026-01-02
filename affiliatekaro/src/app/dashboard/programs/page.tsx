import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import ProgramsClient from "@/app/dashboard/programs/programs-client";

export default async function ProgramsPage() {
  const session = await requireSession();

  const programs = await prisma.program.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const safePrograms = programs.map((p) => ({
    id: p.id,
    name: p.name,
    commissionType: p.commissionType,
    commissionValue: p.commissionValue.toString(),
    cookieDays: p.cookieDays,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <p className="text-sm text-neutral-600">
          Create affiliate programs and manage commission rules.
        </p>
      </div>

      <ProgramsClient initialPrograms={safePrograms} />
    </div>
  );
}


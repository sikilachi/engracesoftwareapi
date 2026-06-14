import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmProviderServicesClient from "@/components/SmmProviderServicesClient";

export const dynamic = "force-dynamic";

export default async function SmmProviderServicesPage() {
  const [services, providers] = await Promise.all([
    prisma.smmProviderService.findMany({
      include: { provider: { select: { id: true, name: true } } },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      take: 500,
    }),
    prisma.smmProvider.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Provider Services" sub="Imported provider catalog with platform/type detection, min/max, rate, and refill support." />
      <SmmProviderServicesClient services={services} providers={providers} />
    </div>
  );
}

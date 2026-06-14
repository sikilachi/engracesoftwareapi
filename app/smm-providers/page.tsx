import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmProvidersClient from "@/components/SmmProvidersClient";

export const dynamic = "force-dynamic";

export default async function SmmProvidersPage() {
  const providers = await prisma.smmProvider.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { services: true } } },
  });
  return (
    <div>
      <PageHeader title="SMM Providers" sub="Add providers, test API connectivity, check balances, and import service catalogs." />
      <SmmProvidersClient providers={providers.map(p => ({
        id: p.id, name: p.name, baseUrl: p.baseUrl, active: p.active, status: p.status,
        healthMessage: p.healthMessage, balance: p.balance, currency: p.currency, serviceCount: p._count.services,
      }))} />
    </div>
  );
}

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmMappingsClient from "@/components/SmmMappingsClient";

export const dynamic = "force-dynamic";

export default async function SmmServiceMappingsPage() {
  const [mappings, providers] = await Promise.all([
    prisma.smmServiceMapping.findMany({
      include: { provider: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.smmProvider.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Service Mappings" sub="Route Shopify product, variant, and customer options to exact provider service IDs." />
      <SmmMappingsClient mappings={mappings} providers={providers} />
    </div>
  );
}

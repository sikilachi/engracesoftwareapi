import { prisma } from "@/lib/db";
import { PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SmmDashboardPage() {
  const [providers, services, mappings, orders, failed, refills] = await Promise.all([
    prisma.smmProvider.count(),
    prisma.smmProviderService.count(),
    prisma.smmServiceMapping.count({ where: { active: true } }),
    prisma.smmOrder.count(),
    prisma.smmOrder.count({ where: { status: { in: ["failed", "manual_review"] } } }),
    prisma.smmRefillRequest.count(),
  ]);
  const recent = await prisma.smmOrder.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <div>
      <PageHeader title="SMM Dashboard" sub="Automation health for paid Shopify SMM orders, provider routing, and refill activity." />
      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Providers" value={providers} />
        <Stat label="Imported services" value={services} />
        <Stat label="Active mappings" value={mappings} accent />
        <Stat label="SMM orders" value={orders} />
        <Stat label="Needs attention" value={failed} />
        <Stat label="Refills" value={refills} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th">Order</th><th className="th">Product</th><th className="th">Route</th><th className="th">Provider order</th><th className="th">Status</th></tr></thead>
          <tbody>
            {recent.map(o => (
              <tr key={o.id} className="border-t border-line">
                <td className="td">{o.shopifyOrderName ?? o.shopifyOrderId}</td>
                <td className="td">{o.productTitle}</td>
                <td className="td">{o.platform ?? "-"} / {o.serviceType ?? "-"} / {o.quantity}</td>
                <td className="td font-mono text-xs">{o.providerOrderId ?? "-"}</td>
                <td className="td">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

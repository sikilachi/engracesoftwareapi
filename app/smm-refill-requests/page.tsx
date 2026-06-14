import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmRefillsClient from "@/components/SmmRefillsClient";

export const dynamic = "force-dynamic";

export default async function SmmRefillRequestsPage() {
  const [orders, refills] = await Promise.all([
    prisma.smmOrder.findMany({
      where: {
        providerOrderId: { not: null },
        refillValidUntil: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.smmRefillRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return (
    <div>
      <PageHeader title="Refill Requests" sub="Request provider refills manually while the stored refill window is still valid." />
      <SmmRefillsClient
        orders={orders.map(o => ({
          id: o.id, shopifyOrderName: o.shopifyOrderName, productTitle: o.productTitle,
          providerOrderId: o.providerOrderId, targetLink: o.targetLink,
          refillValidUntil: o.refillValidUntil?.toISOString() ?? null, status: o.status,
        }))}
        refills={refills.map(r => ({
          id: r.id, smmOrderId: r.smmOrderId, providerOrderId: r.providerOrderId,
          status: r.status, notes: r.notes, createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

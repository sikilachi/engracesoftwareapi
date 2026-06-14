import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmOrdersClient from "@/components/SmmOrdersClient";

export const dynamic = "force-dynamic";

export default async function SmmFailedOrdersPage() {
  const orders = await prisma.smmOrder.findMany({
    where: { status: { in: ["failed", "manual_review"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <PageHeader title="Failed Orders" sub="SMM orders that need a mapping fix, valid target link, or provider retry." />
      <SmmOrdersClient orders={orders.map(o => ({
        id: o.id, shopifyOrderName: o.shopifyOrderName ?? o.shopifyOrderId, productTitle: o.productTitle,
        variantLabel: o.variantLabel, targetLink: o.targetLink, quantity: o.quantity, refill: o.refill,
        providerServiceId: o.providerServiceId, providerOrderId: o.providerOrderId, platform: o.platform,
        serviceType: o.serviceType, status: o.status, notes: o.notes ?? "", optionsJson: o.optionsJson,
        customerJson: o.customerJson, createdAt: o.createdAt.toISOString(),
      }))} />
    </div>
  );
}

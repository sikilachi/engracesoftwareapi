import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmOrdersClient from "@/components/SmmOrdersClient";

export const dynamic = "force-dynamic";

export default async function SmmOrdersPage() {
  const orders = await prisma.smmOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="SMM Sipariş Kuyruğu" sub="Shopify webhook'tan düşen siparişler. Manuel akış: kopyala → panelde oluştur → durumu güncelle." />
      <SmmOrdersClient orders={orders.map(o => ({
        id: o.id, shopifyOrderName: o.shopifyOrderName ?? o.shopifyOrderId, productTitle: o.productTitle,
        variantLabel: o.variantLabel, targetLink: o.targetLink, quantity: o.quantity, refill: o.refill,
        providerServiceId: o.providerServiceId, status: o.status, notes: o.notes ?? "",
        optionsJson: o.optionsJson, customerJson: o.customerJson, createdAt: o.createdAt.toISOString(),
      }))} />
    </div>
  );
}

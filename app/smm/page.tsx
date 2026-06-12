import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SmmClient from "@/components/SmmClient";

export const dynamic = "force-dynamic";

export default async function SmmPage() {
  const [groups, suppliers] = await Promise.all([
    prisma.smmGroup.findMany({ orderBy: { createdAt: "desc" }, include: { variants: true } }),
    prisma.supplier.findMany({ where: { type: "smm" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="SMM Hizmetleri" sub="Her grup Shopify'da tek ürün olur; paketler varyant olarak eklenir." />
      <SmmClient
        groups={groups.map(g => ({
          id: g.id, title: g.title, platform: g.platform, status: g.status, logoUrl: g.logoUrl,
          shopifyProductId: g.shopifyProductId, requiredFieldsJson: g.requiredFieldsJson,
          descriptionHtml: g.descriptionHtml ?? "",
          variants: g.variants.map(v => ({
            id: v.id, label: v.label, quantity: v.quantity, country: v.country, refill: v.refill,
            speed: v.speed, providerServiceId: v.providerServiceId, costPrice: v.costPrice, price: v.price, active: v.active,
          })),
        }))}
        suppliers={suppliers}
      />
    </div>
  );
}

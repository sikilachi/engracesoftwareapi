import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import PriceRulesClient from "@/components/PriceRulesClient";

export const dynamic = "force-dynamic";

export default async function PriceRulesPage() {
  const [rules, suppliers, cats] = await Promise.all([
    prisma.priceRule.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "desc" }] }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.product.groupBy({ by: ["supplierCategory"], where: { supplierCategory: { not: null } } }),
  ]);
  return (
    <div>
      <PageHeader title="Fiyat Kuralları" sub="Öncelik: ürün > kategori > tedarikçi > genel. Aynı kapsamda yüksek priority kazanır." />
      <PriceRulesClient
        rules={rules.map(r => ({
          id: r.id, name: r.name, scope: r.scope, supplierId: r.supplierId, category: r.category,
          productId: r.productId, markupType: r.markupType, markupValue: r.markupValue, minProfit: r.minProfit,
          rounding: r.rounding, compareAtMultiplier: r.compareAtMultiplier, priority: r.priority, active: r.active,
        }))}
        suppliers={suppliers}
        categories={cats.map(c => c.supplierCategory as string).sort()}
      />
    </div>
  );
}

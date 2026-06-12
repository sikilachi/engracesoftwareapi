import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import MappingClient from "@/components/MappingClient";

export const dynamic = "force-dynamic";

export default async function MappingPage() {
  const [mappings, suppliers, cats] = await Promise.all([
    prisma.categoryMapping.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.product.groupBy({ by: ["supplierCategory"], _count: true, where: { supplierCategory: { not: null } } }),
  ]);
  return (
    <div>
      <PageHeader title="Kategori Eşleme" sub="Tedarikçi kategorisi → Shopify koleksiyonu. Yayında otomatik uygulanır." />
      <MappingClient
        mappings={mappings.map(m => ({
          id: m.id, supplierId: m.supplierId, supplierCategory: m.supplierCategory,
          shopifyCollection: m.shopifyCollection, autoTagsJson: m.autoTagsJson,
        }))}
        suppliers={suppliers}
        categories={cats.map(c => ({ name: c.supplierCategory as string, count: c._count })).sort((a, b) => b.count - a.count)}
      />
    </div>
  );
}

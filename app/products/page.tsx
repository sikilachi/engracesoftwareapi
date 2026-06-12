import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import ProductsClient from "@/components/ProductsClient";
import { jget } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { supplier, category, platform, state, q, imported } = searchParams;

  const hasFilter = !!(supplier || category || platform || state || q || imported);

  const where: any = {};
  if (supplier) where.supplierId = supplier;
  if (category) where.supplierCategory = category;
  if (platform) where.platform = platform;
  if (state) where.state = state;
  if (imported === "yes") where.shopifyProductId = { not: null };
  if (imported === "no") where.shopifyProductId = null;
  if (q) where.title = { contains: q };

  // Kategori, platform listelerini hızlı çek (sadece distinct değerler)
  const [products, suppliers, allCategories, allPlatforms] = await Promise.all([
    hasFilter
      ? prisma.product.findMany({
          where,
          orderBy: { lastFetchedAt: "desc" },
          take: 500,
          include: { supplier: { select: { name: true, type: true } } },
        })
      : Promise.resolve([]),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({ select: { supplierCategory: true }, distinct: ["supplierCategory"], where: { supplierCategory: { not: null } }, orderBy: { supplierCategory: "asc" } }),
    prisma.product.findMany({ select: { platform: true }, distinct: ["platform"], where: { platform: { not: null } }, orderBy: { platform: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Ürünler"
        sub={hasFilter ? `${products.length} ürün` : "Tedarikçi veya kategori seçerek ürünleri yükle"}
      />
      <ProductsClient
        suppliers={suppliers}
        allCategories={allCategories.map(p => p.supplierCategory!)}
        allPlatforms={allPlatforms.map(p => p.platform!)}
        products={products.map(p => ({
          id: p.id, title: p.title, sku: p.sku,
          supplierId: p.supplierId, supplierName: p.supplier.name,
          category: p.supplierCategory, platform: p.platform, region: p.region,
          language: p.language, deliveryType: p.deliveryType,
          cost: p.costPrice, currency: p.currency, price: p.sellingPrice, compareAt: p.compareAtPrice,
          stock: p.supplierStock, shopifyStock: p.shopifyStock,
          state: p.state, publishStatus: p.publishStatus,
          shopifyId: p.shopifyProductId,
          image: jget<string[]>(p.imagesJson, [])[0] ?? null,
          hasImage: jget<string[]>(p.imagesJson, []).length > 0,
          hasDescription: Boolean(p.description),
          priceChanged: p.priceChanged, stockChanged: p.stockChanged,
        }))}
      />
    </div>
  );
}

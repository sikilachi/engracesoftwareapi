import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/ui";
import ProductsClient from "@/components/ProductsClient";

export const dynamic = "force-dynamic";
const PRODUCT_PAGE_SIZE = 200;

type ProductListRow = {
  id: string;
  title: string;
  sku: string | null;
  supplierId: string;
  supplierName: string;
  category: string | null;
  platform: string | null;
  region: string | null;
  language: string | null;
  deliveryType: string | null;
  cost: number;
  currency: string;
  price: number | null;
  compareAt: number | null;
  stock: number;
  shopifyStock: number | null;
  requiresShipping: boolean;
  trackInventory: boolean;
  state: string;
  publishStatus: string;
  shopifyId: string | null;
  image: string | null;
  hasImage: boolean;
  hasDescription: boolean;
  priceChanged: boolean;
  stockChanged: boolean;
};

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { supplier, category, platform, state, q, imported } = searchParams;

  const hasFilter = !!(supplier || category || platform || state || q || imported);

  const filters: Prisma.Sql[] = [];
  if (supplier) filters.push(Prisma.sql`p."supplierId" = ${supplier}`);
  if (category) filters.push(Prisma.sql`p."supplierCategory" = ${category}`);
  if (platform) filters.push(Prisma.sql`p."platform" = ${platform}`);
  if (state) filters.push(Prisma.sql`p."state" = ${state}`);
  if (imported === "yes") filters.push(Prisma.sql`p."shopifyProductId" IS NOT NULL`);
  if (imported === "no") filters.push(Prisma.sql`p."shopifyProductId" IS NULL`);
  if (q) filters.push(Prisma.sql`p."title" ILIKE ${`%${q}%`}`);
  const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}` : Prisma.empty;

  // Kategori, platform listelerini hızlı çek (sadece distinct değerler)
  const [products, suppliers, allCategories, allPlatforms] = await Promise.all([
    hasFilter
      ? prisma.$queryRaw<ProductListRow[]>(Prisma.sql`
          SELECT
            p."id",
            p."title",
            p."sku",
            p."supplierId",
            s."name" AS "supplierName",
            p."supplierCategory" AS "category",
            p."platform",
            p."region",
            p."language",
            p."deliveryType",
            p."costPrice" AS "cost",
            p."currency",
            p."sellingPrice" AS "price",
            p."compareAtPrice" AS "compareAt",
            p."supplierStock" AS "stock",
            p."shopifyStock",
            p."requiresShipping",
            p."trackInventory",
            p."state",
            p."publishStatus",
            p."shopifyProductId" AS "shopifyId",
            CASE WHEN p."imagesJson" IS NOT NULL AND p."imagesJson" <> '[]' THEN p."imagesJson"::jsonb ->> 0 ELSE NULL END AS "image",
            p."imagesJson" IS NOT NULL AND p."imagesJson" <> '[]' AS "hasImage",
            p."description" IS NOT NULL AND p."description" <> '' AS "hasDescription",
            p."priceChanged",
            p."stockChanged"
          FROM "Product" p
          JOIN "Supplier" s ON s."id" = p."supplierId"
          ${whereSql}
          ORDER BY p."lastFetchedAt" DESC
          LIMIT ${PRODUCT_PAGE_SIZE}
        `)
      : Promise.resolve([] as ProductListRow[]),
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
        products={products}
      />
    </div>
  );
}

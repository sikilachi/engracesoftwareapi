import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductEditor from "@/components/ProductEditor";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const p = await prisma.product.findUnique({ where: { id: params.id }, include: { supplier: true } });
  if (!p) notFound();
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  return (
    <ProductEditor
      product={{
        id: p.id, title: p.title, description: p.description ?? "", shortDescription: p.shortDescription ?? "",
        usageInstructions: p.usageInstructions ?? "", activationInstructions: p.activationInstructions ?? "",
        platform: p.platform ?? "", region: p.region ?? "", language: p.language ?? "", edition: p.edition ?? "",
        licenseType: p.licenseType ?? "", deliveryType: p.deliveryType ?? "", activationType: p.activationType ?? "",
        supplierCategory: p.supplierCategory ?? "", sku: p.sku ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
        publishStatus: p.publishStatus, state: p.state,
        imagesJson: p.imagesJson, tagsJson: p.tagsJson, collectionsJson: p.collectionsJson, stockRuleJson: p.stockRuleJson ?? "",
        metaJson: p.metaJson,
        currency: p.currency, costPrice: p.costPrice, sellingPrice: p.sellingPrice, priceOverride: p.priceOverride,
        compareAtPrice: p.compareAtPrice, supplierStock: p.supplierStock, shopifyStock: p.shopifyStock,
        syncPrice: p.syncPrice, syncStock: p.syncStock, syncTitle: p.syncTitle, syncDescription: p.syncDescription,
        syncImages: p.syncImages, requiresShipping: p.requiresShipping, trackInventory: p.trackInventory,
        protectEdits: p.protectEdits, manuallyEdited: p.manuallyEdited,
        shopifyProductId: p.shopifyProductId, supplierName: p.supplier.name, supplierProductId: p.supplierProductId,
        lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
      }}
      suppliers={suppliers}
    />
  );
}

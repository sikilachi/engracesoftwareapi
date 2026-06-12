// Senkron motoru: fetch / stok / fiyat / yayınlama işleri
import { prisma } from "./db";
import { log } from "./logger";
import { getConnector, ctxFromSupplier } from "./connectors";
import { getSettings, type StockRule } from "./settings";
import { computeShopifyStock } from "./stock";
import { computePrice, resolveRule } from "./pricing";
import { jget, jput } from "./json";
import { publishProduct, updateVariantPrice, getVariantInventoryItem, setInventory, ensureCollection, addToCollections, shopifyConfigured } from "./shopify";

// ── Katalog'dan seçili normalize ürünleri direkt import ──────
export async function importNormalizedProducts(supplierId: string, items: any[]) {
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  let success = 0, failed = 0;
  for (const item of items) {
    try {
      await prisma.product.upsert({
        where: { supplierId_supplierProductId: { supplierId, supplierProductId: String(item.supplierProductId) } },
        create: {
          supplierId, supplierProductId: String(item.supplierProductId),
          sku: `${supplier.type.toUpperCase()}-${item.supplierProductId}`,
          title: item.title, description: item.description ?? null,
          platform: item.platform ?? null, region: item.region ?? null,
          language: item.language ?? null, deliveryType: item.deliveryType ?? null,
          supplierCategory: item.supplierCategory ?? null,
          currency: item.currency ?? "USD",
          costPrice: Number(item.costPrice ?? 0),
          supplierStock: Number(item.stock ?? 0),
          imagesJson: jput(item.images ?? []),
          tagsJson: jput(item.tags ?? []),
          metaJson: jput(item.meta ?? {}),
        },
        update: {
          title: item.title, costPrice: Number(item.costPrice ?? 0),
          supplierStock: Number(item.stock ?? 0), lastFetchedAt: new Date(),
        },
      });
      success++;
    } catch { failed++; }
  }
  return { success, failed };
}

export async function startJob(type: string, total = 0) {
  return prisma.syncJob.create({ data: { type, total } });
}
export async function finishJob(id: string, success: number, failed: number, detail?: string) {
  return prisma.syncJob.update({
    where: { id },
    data: { status: failed > 0 && success === 0 ? "failed" : "done", success, failed, detail, finishedAt: new Date() },
  });
}

// ── Tedarikçiden ürün çekme + normalize + upsert ──────────────
export async function fetchFromSupplier(supplierId: string, opts?: { pages?: number; limit?: number }) {
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const connector = getConnector(supplier.type);
  const ctx = ctxFromSupplier(supplier);
  const job = await startJob("fetch");
  let success = 0, failed = 0;

  try {
    const pages = opts?.pages ?? 1;
    for (let page = 1; page <= pages; page++) {
      const items = await connector.fetchProducts(ctx, { page, limit: opts?.limit ?? 100 });
      if (items.length === 0) break;
      for (const item of items) {
        try {
          const existing = await prisma.product.findUnique({
            where: { supplierId_supplierProductId: { supplierId, supplierProductId: item.supplierProductId } },
          });
          const base = {
            title: item.title,
            description: item.description ?? null,
            shortDescription: item.shortDescription ?? null,
            usageInstructions: item.usageInstructions ?? null,
            activationInstructions: item.activationInstructions ?? null,
            platform: item.platform ?? null,
            region: item.region ?? null,
            language: item.language ?? null,
            edition: item.edition ?? null,
            licenseType: item.licenseType ?? null,
            deliveryType: item.deliveryType ?? null,
            activationType: item.activationType ?? null,
            supplierCategory: item.supplierCategory ?? null,
            supplierStatus: item.supplierStatus ?? null,
            currency: item.currency,
            imagesJson: jput(item.images),
            tagsJson: jput(item.tags),
            metaJson: jput(item.meta),
            lastFetchedAt: new Date(),
          };

          if (!existing) {
            await prisma.product.create({
              data: {
                ...base,
                supplierId,
                supplierProductId: item.supplierProductId,
                sku: `${supplier.type.toUpperCase()}-${item.supplierProductId}`,
                costPrice: item.costPrice,
                supplierStock: item.stock,
              },
            });
          } else {
            const priceChanged = existing.costPrice !== item.costPrice;
            const stockChanged = existing.supplierStock !== item.stock;
            // "Manuel düzenlemeleri koru" açıksa içerik alanlarını ezme
            const contentUpdate = existing.protectEdits && existing.manuallyEdited ? {} : base;
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                ...contentUpdate,
                costPrice: item.costPrice,
                supplierStock: item.stock,
                priceChanged: priceChanged || existing.priceChanged,
                stockChanged: stockChanged || existing.stockChanged,
                lastFetchedAt: new Date(),
              },
            });
          }
          success++;
        } catch (e: any) {
          failed++;
          await log("sync", `Ürün upsert hatası: ${item.title}`, "error", { error: e.message });
        }
      }
    }
    await prisma.supplier.update({ where: { id: supplierId }, data: { lastSyncAt: new Date(), status: "ok", healthMessage: null } });
    await log("sync", `${supplier.name}: ${success} ürün çekildi, ${failed} hata`);
  } catch (e: any) {
    failed++;
    await prisma.supplier.update({ where: { id: supplierId }, data: { status: "error", healthMessage: e.message } });
    await log("sync", `${supplier.name} fetch başarısız: ${e.message}`, "error");
  }

  await finishJob(job.id, success, failed);
  return { success, failed, jobId: job.id };
}

// ── Fiyat hesapla (kaydet) ────────────────────────────────────
export async function repriceProduct(productId: string) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const settings = await getSettings();
  const rule = await resolveRule(p);
  const r = computePrice({ costPrice: p.costPrice, currency: p.currency, settings, rule, priceOverride: p.priceOverride });
  await prisma.product.update({
    where: { id: productId },
    data: { sellingPrice: r.price, compareAtPrice: r.compareAt, priceChanged: false },
  });
  return r;
}

export async function restockProduct(productId: string) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const settings = await getSettings();
  const rule = jget<StockRule | null>(p.stockRuleJson, null) ?? settings.stockRule;
  const isSmm = p.deliveryType === "smm_service";
  const qty = isSmm && !settings.applyStockRuleToSmm ? p.supplierStock : computeShopifyStock(p.supplierStock, rule);
  await prisma.product.update({ where: { id: productId }, data: { shopifyStock: qty, stockChanged: false } });
  return qty;
}

// ── Shopify'a yayınla / güncelle ──────────────────────────────
export async function publishToShopify(productId: string, statusOverride?: "draft" | "active") {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { supplier: true } });

  // fiyat ve stok güncel değilse hesapla
  const priceRes = await repriceProduct(productId);
  const qty = await restockProduct(productId);

  // kategori eşlemesi → koleksiyon
  const mappings = await prisma.categoryMapping.findMany({
    where: { supplierCategory: p.supplierCategory ?? "__none__" },
  });
  const mapped = mappings.filter(m => !m.supplierId || m.supplierId === p.supplierId);
  const manualCollections = jget<string[]>(p.collectionsJson, []);
  const collectionTitles = Array.from(new Set([...manualCollections, ...mapped.map(m => m.shopifyCollection)]));
  const autoTags = mapped.flatMap(m => jget<string[]>(m.autoTagsJson, []));

  const tags = Array.from(new Set([
    ...jget<string[]>(p.tagsJson, []),
    ...autoTags,
    p.supplier.name,
    ...(p.platform ? [p.platform] : []),
    ...(p.region ? [p.region] : []),
  ])).slice(0, 50);

  const result = await publishProduct({
    title: p.title,
    descriptionHtml: p.description ?? `<p>${p.title}</p>`,
    vendor: p.supplier.name,
    productType: p.supplierCategory ?? "Digital",
    tags,
    status: (statusOverride ?? p.publishStatus) === "active" ? "ACTIVE" : "DRAFT",
    sku: p.sku ?? `${p.supplier.type.toUpperCase()}-${p.supplierProductId}`,
    price: priceRes.price,
    compareAtPrice: priceRes.compareAt,
    inventoryQty: qty,
    images: jget<string[]>(p.imagesJson, []),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    metafields: [
      { key: "supplier", value: p.supplier.name },
      { key: "supplier_product_id", value: p.supplierProductId },
      { key: "usage_instructions", value: p.usageInstructions ?? "" },
      { key: "activation_instructions", value: p.activationInstructions ?? "" },
      { key: "last_sync", value: new Date().toISOString() },
      { key: "platform", value: p.platform ?? "" },
      { key: "region", value: p.region ?? "" },
    ],
    existingShopifyId: p.shopifyProductId,
  });

  // koleksiyonlara ekle (yoksa oluştur)
  for (const title of collectionTitles) {
    try {
      const colId = await ensureCollection(title);
      await addToCollections(result.productId, [colId]);
    } catch (e: any) {
      await log("shopify", `Koleksiyon hatası (${title}): ${e.message}`, "warn");
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      shopifyProductId: result.productId,
      state: "published",
      publishStatus: statusOverride ?? p.publishStatus,
      lastSyncedAt: new Date(),
    },
  });
  await log("shopify", `${p.title} ${result.created ? "oluşturuldu" : "güncellendi"}`);
  return result;
}

// ── Toplu senkron: stok / fiyat / her ikisi ───────────────────
export async function syncProducts(productIds: string[], what: "stock" | "price" | "both") {
  const job = await startJob(what === "both" ? "full" : what, productIds.length);
  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const id of productIds) {
    try {
      const p = await prisma.product.findUniqueOrThrow({ where: { id } });
      if (what === "price" || what === "both") {
        const r = await repriceProduct(id);
        if (p.shopifyProductId && p.syncPrice && shopifyConfigured()) {
          await updateVariantPrice(p.shopifyProductId, r.price, r.compareAt);
        }
      }
      if (what === "stock" || what === "both") {
        const qty = await restockProduct(id);
        if (p.shopifyProductId && p.syncStock && shopifyConfigured()) {
          const v = await getVariantInventoryItem(p.shopifyProductId);
          if (v) await setInventory(v.inventoryItemId, qty);
        }
      }
      await prisma.product.update({ where: { id }, data: { lastSyncedAt: new Date() } });
      success++;
    } catch (e: any) {
      failed++;
      errors.push(e.message);
      await log("sync", `Senkron hatası (${id}): ${e.message}`, "error");
    }
  }
  await finishJob(job.id, success, failed, errors.slice(0, 5).join(" | "));
  return { success, failed, jobId: job.id };
}

// Senkron motoru: fetch / stok / fiyat / yayınlama işleri
import { prisma } from "./db";
import { log } from "./logger";
import { getConnector, ctxFromSupplier } from "./connectors";
import { getSettings, type StockRule } from "./settings";
import { computeShopifyStock } from "./stock";
import { computePrice, resolveRule } from "./pricing";
import { jget, jput } from "./json";
import { publishProduct, setMetafields, updateVariantPrice, getVariantInventoryItem, setInventory, ensureCollection, addToCollections, publishToPublications, shopifyConfigured } from "./shopify";

// ── Açıklama HTML temizle + özellik tablosu ekle ─────────────
function cleanHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/class="[^"]*"/gi, "")
    .replace(/<font[^>]*>/gi, "").replace(/<\/font>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/(<p>\s*<\/p>\s*){2,}/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

function buildDescriptionHtml(p: {
  description?: string | null;
  platform?: string | null;
  region?: string | null;
  language?: string | null;
  licenseType?: string | null;
  deliveryType?: string | null;
  edition?: string | null;
  activationType?: string | null;
}): string {
  const specs: [string, string][] = [
    ["Platform", p.platform ?? ""],
    ["Bölge", p.region ?? ""],
    ["Dil", p.language ?? ""],
    ["Sürüm", p.edition ?? ""],
    ["Lisans tipi", p.licenseType ?? ""],
    ["Teslimat tipi", p.deliveryType ?? ""],
    ["Aktivasyon tipi", p.activationType ?? ""],
  ].filter(([, v]) => v) as [string, string][];

  const mainHtml = p.description ? cleanHtml(p.description) : "";

  if (specs.length === 0) return mainHtml || `<p>${"Dijital ürün"}</p>`;

  const rows = specs.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;">${v}</td></tr>`
  ).join("");

  const table = `<table style="border-collapse:collapse;margin-top:16px;width:100%;font-size:14px;">${rows}</table>`;

  return (mainHtml ? `${mainHtml}\n` : "") + table;
}

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
          requiresShipping: false,
          trackInventory: true,
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
  const newestSortBy = typeof ctx.config?.newestSortBy === "string" ? ctx.config.newestSortBy : "updatedAt";
  const job = await startJob("fetch");
  let success = 0, failed = 0;

  try {
    const pages = opts?.pages ?? 1;
    for (let page = 1; page <= pages; page++) {
      const items = await connector.fetchProducts(ctx, { page, limit: opts?.limit ?? 100, sortBy: newestSortBy, sortType: "desc" });
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
                requiresShipping: false,
                trackInventory: true,
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
type PublishOptions = {
  sku?: string;
  vendor?: string;
  templateSuffix?: string | null;
  requiresShipping?: boolean;
  trackInventory?: boolean;
  publicationIds?: string[];
  saveOptions?: boolean;
};

export async function publishToShopify(productId: string, statusOverride?: "draft" | "active", options: PublishOptions = {}) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { supplier: true } });
  const publishSku = options.sku ?? p.sku ?? `${p.supplier.type.toUpperCase()}-${p.supplierProductId}`;
  const publishVendor = options.vendor ?? p.supplier.name;
  const publishRequiresShipping = options.requiresShipping ?? p.requiresShipping;
  const publishTrackInventory = options.trackInventory ?? p.trackInventory;
  const publishTemplateSuffix = options.templateSuffix !== undefined
    ? (options.templateSuffix || null)
    : (/smm/i.test(p.deliveryType ?? "") ? null : "srd-digital");

  if (options.saveOptions) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sku: publishSku,
        requiresShipping: publishRequiresShipping,
        trackInventory: publishTrackInventory,
        manuallyEdited: true,
      },
    });
  }

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
  const collectionRuleTags = collectionTitles.map(t => t.trim()).filter(Boolean);

  const tags = Array.from(new Set([
    ...jget<string[]>(p.tagsJson, []),
    ...collectionRuleTags,
    ...autoTags,
    p.supplier.name,
    ...(p.platform ? [p.platform] : []),
    ...(p.region ? [p.region] : []),
  ])).slice(0, 50);

  // ── SRD ürün sayfası metafield'ları (tema namespace "srd" okur) ──
  const pcPlatforms = ["steam", "origin", "uplay", "ubisoft", "epic", "gog", "battle", "ea app", "rockstar"];
  const isPc = pcPlatforms.some(x => (p.platform ?? "").toLowerCase().includes(x));
  const isAccount = /account/i.test(`${p.licenseType ?? ""} ${p.activationType ?? ""} ${p.deliveryType ?? ""}`);
  const regionRaw = (p.region ?? "").trim();
  const srdRegion = /free|global/i.test(regionRaw)
    ? "Global"
    : regionRaw.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const srdLicense = (p.licenseType ?? "").trim() || (isAccount ? "Account" : "Key");
  const srdDelivery = /smm/i.test(p.deliveryType ?? "") ? "Service" : "Email";

  const srdActivation = isAccount
    ? "Check your inbox|Open the delivery email — your account details are inside. Check spam if you don't see it.\nSign in|Launch the platform client and sign in with the provided details.\nSecure the account|Follow the instructions to set your own email and enable 2FA.\nDownload & play|Install from your library and start playing."
    : "Complete your order|Pay securely — your key is generated instantly.\nCheck your email|Your key arrives by email within seconds. Check spam too.\nRedeem the key|Open the platform client and redeem the key in your library.\nDownload & play|Install and enjoy.";
  const srdFaq =
    "How fast will I receive my order?|Delivery is automated — your details arrive by email within seconds of payment.\n" +
    "Is this region locked?|Check the Region spec above. Region-free products can be used worldwide.\n" +
    "What if I have a problem with my order?|Our support team is here to help and every order is covered by buyer protection.";

  const srd = [
    { namespace: "srd", key: "platform",     type: "single_line_text_field", value: p.platform ?? "" },
    { namespace: "srd", key: "region",       type: "single_line_text_field", value: srdRegion },
    { namespace: "srd", key: "language",     type: "single_line_text_field", value: p.language ?? "" },
    { namespace: "srd", key: "license_type", type: "single_line_text_field", value: srdLicense },
    { namespace: "srd", key: "delivery",     type: "single_line_text_field", value: srdDelivery },
    { namespace: "srd", key: "validity",     type: "single_line_text_field", value: "Lifetime" },
    { namespace: "srd", key: "devices",      type: "single_line_text_field", value: isPc ? "1 PC" : "" },
    { namespace: "srd", key: "activation",   type: "multi_line_text_field",  value: (p.activationInstructions ?? "").includes("|") ? p.activationInstructions! : srdActivation },
    { namespace: "srd", key: "faq",          type: "multi_line_text_field",  value: srdFaq },
  ];

  const result = await publishProduct({
    title: p.title,
    descriptionHtml: buildDescriptionHtml(p),
    vendor: publishVendor,
    productType: p.supplierCategory ?? "Digital",
    tags,
    status: (statusOverride ?? p.publishStatus) === "active" ? "ACTIVE" : "DRAFT",
    sku: publishSku,
    price: priceRes.price,
    compareAtPrice: priceRes.compareAt,
    inventoryQty: qty,
    trackInventory: publishTrackInventory,
    requiresShipping: publishRequiresShipping,
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
      { key: "language", value: p.language ?? "" },
      { key: "license_type", value: p.licenseType ?? "" },
      { key: "delivery_type", value: p.deliveryType ?? "" },
      { key: "edition", value: p.edition ?? "" },
      { key: "requires_shipping", type: "boolean", value: String(publishRequiresShipping) },
      { key: "track_inventory", type: "boolean", value: String(publishTrackInventory) },
      { key: "collections", namespace: "engrace", type: "list.single_line_text_field", value: JSON.stringify(collectionTitles) },
      { key: "collection_tags", namespace: "engrace", type: "list.single_line_text_field", value: JSON.stringify(collectionRuleTags) },
    ],
    templateSuffix: publishTemplateSuffix,
    existingShopifyId: p.shopifyProductId,
  });

  try {
    await setMetafields(result.productId, [
      { namespace: "engrace", key: "collections", type: "list.single_line_text_field", value: JSON.stringify(collectionTitles) },
      { namespace: "engrace", key: "collection_tags", type: "list.single_line_text_field", value: JSON.stringify(collectionRuleTags) },
    ]);
  } catch (e: any) {
    await log("shopify", `Koleksiyon metafield yazilamadi (${p.title}): ${e.message}`, "warn");
  }

  // srd.* metafield'larını garanti yaz (productSet tanımsızları düşürebiliyor)
  if (options.publicationIds?.length) {
    try {
      await publishToPublications(result.productId, options.publicationIds);
    } catch (e: any) {
      await log("shopify", `Satis kanali hatasi (${p.title}): ${e.message}`, "warn");
    }
  }

  if (!/smm/i.test(p.deliveryType ?? "")) {
    try {
      await setMetafields(result.productId, srd);
    } catch (e: any) {
      await log("shopify", `srd metafield yazılamadı (${p.title}): ${e.message}`, "warn");
    }
  }

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

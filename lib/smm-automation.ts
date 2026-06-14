import crypto from "crypto";
import { prisma } from "./db";
import { log } from "./logger";
import { setMetafields } from "./shopify";
import { asInt, normalizePlatform, norm } from "./smm-platforms";
import { fetchProviderOrderStatus, requestProviderRefill, submitProviderOrder } from "./smm-provider-api";

type ShopifyLineItem = {
  id?: string | number;
  product_id?: string | number;
  variant_id?: string | number;
  title?: string;
  variant_title?: string;
  quantity?: number;
  sku?: string;
  properties?: { name?: string; value?: unknown }[];
};

type ShopifyOrder = {
  id: string | number;
  admin_graphql_api_id?: string;
  name?: string;
  email?: string;
  customer?: { first_name?: string; last_name?: string };
  line_items?: ShopifyLineItem[];
};

export function verifyShopifyWebhook(raw: string, hmac: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!hmac) return false;
  const digest = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}

function propsFromLineItem(item: ShopifyLineItem, includePrivate = true) {
  const props: Record<string, string> = {};
  for (const p of item.properties ?? []) {
    if (!p?.name) continue;
    const key = String(p.name).trim();
    if (!includePrivate && key.startsWith("_")) continue;
    props[key] = String(p.value ?? "").trim();
  }
  return props;
}

function prop(props: Record<string, string>, names: string[]) {
  const wanted = names.map(norm);
  const hit = Object.entries(props).find(([key]) => wanted.includes(norm(key)));
  return hit?.[1] ?? "";
}

function isSmmLineItem(item: ShopifyLineItem, props: Record<string, string>) {
  if (norm(props["_SMM Product"]) === "true") return true;
  if (String(item.sku ?? "").startsWith("SMM-")) return true;
  if (prop(props, ["Platform"]) && prop(props, ["Service", "Service type"])) return true;
  return false;
}

function validTargetLink(value: string) {
  if (!value) return false;
  if (value.startsWith("@")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return /^[a-z0-9_.-]{2,}$/i.test(value);
  }
}

function lineItemQuantity(item: ShopifyLineItem, props: Record<string, string>) {
  const fromProps = asInt(prop(props, ["Quantity", "Miktar", "Selected quantity"]));
  if (fromProps && fromProps > 0) return fromProps;
  return Math.max(1, Number(item.quantity ?? 1));
}

async function findMapping(input: {
  productId: string;
  variantId: string;
  platform: string;
  serviceType: string;
  country: string;
  gender: string;
  refillDays: number | null;
  speed: string;
  quality: string;
  quantity: number;
}) {
  const mappings = await prisma.smmServiceMapping.findMany({
    where: {
      active: true,
      shopifyProductId: input.productId,
      OR: [{ shopifyVariantId: input.variantId || null }, { shopifyVariantId: null }],
      minQuantity: { lte: input.quantity },
      maxQuantity: { gte: input.quantity },
      provider: { active: true },
    },
    include: { provider: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return mappings.find(m =>
    normalizePlatform(m.platform) === normalizePlatform(input.platform) &&
    norm(m.serviceType) === norm(input.serviceType) &&
    (!m.country || norm(m.country) === norm(input.country)) &&
    (!m.gender || norm(m.gender) === norm(input.gender)) &&
    (m.refillDays == null || m.refillDays === input.refillDays) &&
    (!m.speed || norm(m.speed) === norm(input.speed)) &&
    (!m.quality || norm(m.quality) === norm(input.quality))
  ) ?? null;
}

async function writeOrderMetafield(order: ShopifyOrder, status: string, details: Record<string, unknown>) {
  const ownerId = order.admin_graphql_api_id;
  if (!ownerId) return;
  try {
    await setMetafields(ownerId, [{
      namespace: "engrace_smm",
      key: "automation_status",
      type: "json",
      value: JSON.stringify({ status, ...details }).slice(0, 12000),
    }]);
  } catch (e: any) {
    await log("smm", "Could not write Shopify SMM metafield", "warn", { orderId: order.id, error: e.message });
  }
}

export async function processPaidSmmOrder(order: ShopifyOrder) {
  let processed = 0;
  let submitted = 0;
  let manualReview = 0;
  let failed = 0;

  for (const item of order.line_items ?? []) {
    const props = propsFromLineItem(item);
    if (!isSmmLineItem(item, props)) continue;
    processed++;

    const shopifyOrderId = String(order.id);
    const shopifyLineItemId = String(item.id ?? `${item.product_id ?? item.title}-${item.variant_id ?? item.variant_title ?? ""}`);
    const targetLink = prop(props, ["Target Link", "Target", "Link", "Username", "Hedef Link", "Profil Linki"]);
    const platform = prop(props, ["Platform"]);
    const serviceType = prop(props, ["Service", "Service type", "Service Type"]);
    const country = prop(props, ["Country", "Ulke"]);
    const gender = prop(props, ["Gender", "Cinsiyet"]);
    const speed = prop(props, ["Speed", "Speed / quality", "Hiz"]);
    const quality = prop(props, ["Quality"]);
    const refillRaw = prop(props, ["Refill", "Refill days", "Refill Days"]);
    const refillDays = asInt(refillRaw);
    const quantity = lineItemQuantity(item, props);

    const existing = await prisma.smmOrder.findUnique({
      where: { shopifyOrderId_shopifyLineItemId: { shopifyOrderId, shopifyLineItemId } },
    });
    if (existing?.providerOrderId || ["submitted_to_provider", "processing", "completed"].includes(existing?.status ?? "")) continue;

    const baseData = {
      shopifyOrderId,
      shopifyOrderName: order.name ?? null,
      shopifyLineItemId,
      customerJson: JSON.stringify({
        email: order.email,
        name: `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim(),
      }),
      productTitle: item.title ?? "SMM",
      variantLabel: item.variant_title ?? null,
      optionsJson: JSON.stringify(props),
      targetLink,
      platform,
      serviceType,
      country,
      gender,
      speed,
      quality,
      quantity,
      refill: refillRaw || null,
      refillDays,
      refillValidUntil: refillDays ? new Date(Date.now() + refillDays * 86400000) : null,
    };

    if (!validTargetLink(targetLink)) {
      await prisma.smmOrder.upsert({
        where: { shopifyOrderId_shopifyLineItemId: { shopifyOrderId, shopifyLineItemId } },
        update: { ...baseData, status: "manual_review", notes: "Missing or invalid target link" },
        create: { ...baseData, status: "manual_review", notes: "Missing or invalid target link" },
      });
      manualReview++;
      continue;
    }

    const mapping = await findMapping({
      productId: String(item.product_id ?? ""),
      variantId: String(item.variant_id ?? ""),
      platform,
      serviceType,
      country,
      gender,
      refillDays,
      speed,
      quality,
      quantity,
    });

    if (!mapping) {
      await prisma.smmOrder.upsert({
        where: { shopifyOrderId_shopifyLineItemId: { shopifyOrderId, shopifyLineItemId } },
        update: { ...baseData, status: "manual_review", notes: "No active SMM service mapping matched" },
        create: { ...baseData, status: "manual_review", notes: "No active SMM service mapping matched" },
      });
      manualReview++;
      continue;
    }

    const smmOrder = await prisma.smmOrder.upsert({
      where: { shopifyOrderId_shopifyLineItemId: { shopifyOrderId, shopifyLineItemId } },
      update: {
        ...baseData,
        providerId: mapping.providerId,
        providerServiceId: mapping.providerServiceId,
        mappingId: mapping.id,
        status: "pending_provider_submission",
      },
      create: {
        ...baseData,
        providerId: mapping.providerId,
        providerServiceId: mapping.providerServiceId,
        mappingId: mapping.id,
        status: "pending_provider_submission",
      },
    });

    try {
      const response = await submitProviderOrder(mapping.provider, {
        service: mapping.providerServiceId,
        link: targetLink,
        quantity,
      });
      const providerOrderId = String(response.order ?? response.id ?? "");
      await prisma.smmOrder.update({
        where: { id: smmOrder.id },
        data: {
          providerOrderId: providerOrderId || null,
          providerResponse: JSON.stringify(response).slice(0, 12000),
          status: providerOrderId ? "submitted_to_provider" : "manual_review",
          notes: providerOrderId ? null : "Provider response did not include an order id",
        },
      });
      providerOrderId ? submitted++ : manualReview++;
    } catch (e: any) {
      await prisma.smmOrder.update({
        where: { id: smmOrder.id },
        data: { status: "failed", notes: e.message, providerResponse: JSON.stringify({ error: e.message }).slice(0, 12000) },
      });
      failed++;
    }
  }

  if (processed) {
    await log("smm", `Paid webhook processed ${processed} SMM line item(s) for ${order.name ?? order.id}`, failed ? "warn" : "info", { submitted, manualReview, failed });
    await writeOrderMetafield(order, failed ? "failed_or_partial" : "processed", { processed, submitted, manualReview, failed });
  }
  return { processed, submitted, manualReview, failed };
}

export async function syncSmmOrderStatuses() {
  const orders = await prisma.smmOrder.findMany({
    where: {
      providerOrderId: { not: null },
      status: { in: ["submitted_to_provider", "processing", "in_progress", "pending"] },
    },
    take: 100,
  });

  let updated = 0;
  for (const order of orders) {
    if (!order.providerId || !order.providerOrderId) continue;
    const provider = await prisma.smmProvider.findUnique({ where: { id: order.providerId } });
    if (!provider || !provider.active) continue;
    try {
      const response = await fetchProviderOrderStatus(provider, order.providerOrderId);
      const providerStatus = String(response.status ?? response.Status ?? "");
      const normalized = norm(providerStatus);
      const status = normalized.includes("complete") ? "completed"
        : normalized.includes("cancel") || normalized.includes("fail") || normalized.includes("partial") ? "failed"
        : "processing";
      await prisma.smmOrder.update({
        where: { id: order.id },
        data: {
          status,
          providerStatus: providerStatus || null,
          startCount: asInt(response.start_count ?? response.startCount),
          remains: asInt(response.remains),
          providerResponse: JSON.stringify(response).slice(0, 12000),
        },
      });
      updated++;
    } catch (e: any) {
      await prisma.smmOrder.update({ where: { id: order.id }, data: { notes: `Status sync failed: ${e.message}` } });
    }
  }
  await log("smm", `SMM status sync updated ${updated}/${orders.length} order(s)`);
  return { checked: orders.length, updated };
}

export async function createRefillRequest(smmOrderId: string, notes?: string) {
  const order = await prisma.smmOrder.findUnique({ where: { id: smmOrderId } });
  if (!order) throw new Error("SMM order not found");
  if (!order.providerId || !order.providerOrderId) throw new Error("Order has no provider order id");
  if (order.refillValidUntil && order.refillValidUntil < new Date()) throw new Error("Refill window has expired");
  const provider = await prisma.smmProvider.findUnique({ where: { id: order.providerId } });
  if (!provider || !provider.active) throw new Error("Provider is inactive or missing");

  const refill = await prisma.smmRefillRequest.create({
    data: { smmOrderId, providerId: provider.id, providerOrderId: order.providerOrderId, notes, status: "submitting" },
  });
  try {
    const response = await requestProviderRefill(provider, order.providerOrderId);
    return prisma.smmRefillRequest.update({
      where: { id: refill.id },
      data: { status: "submitted", providerResponse: JSON.stringify(response).slice(0, 12000) },
    });
  } catch (e: any) {
    await prisma.smmRefillRequest.update({
      where: { id: refill.id },
      data: { status: "failed", providerResponse: JSON.stringify({ error: e.message }).slice(0, 12000) },
    });
    throw e;
  }
}

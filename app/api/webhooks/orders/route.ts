// Shopify orders/create webhook'u → SMM sipariş kuyruğu
// Shopify Admin > Settings > Notifications > Webhooks: {APP_URL}/api/webhooks/orders
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

function verifyHmac(raw: string, hmac: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev'de imzasız kabul
  if (!hmac) return false;
  const digest = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  try { return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac)); } catch { return false; }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyHmac(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    await log("smm", "Webhook HMAC doğrulaması başarısız", "warn");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const order = JSON.parse(raw);
  let created = 0;

  for (const item of order.line_items ?? []) {
    const sku: string = item.sku ?? "";
    if (!sku.startsWith("SMM-")) continue; // sadece SMM kalemleri kuyruğa girer

    const variantId = sku.replace("SMM-", "");
    const variant = await prisma.smmVariant.findUnique({ where: { id: variantId }, include: { group: true } });

    // Müşterinin girdiği line item property'lerini topla (hedef link vb.)
    const props: Record<string, string> = {};
    for (const p of item.properties ?? []) {
      if (p?.name && !String(p.name).startsWith("_")) props[p.name] = String(p.value ?? "");
    }
    const targetLink = props["Hedef Link"] ?? props["Profil Linki"] ?? props["Link"] ?? Object.values(props)[0] ?? null;

    await prisma.smmOrder.create({
      data: {
        shopifyOrderId: String(order.id),
        shopifyOrderName: order.name ?? null,
        customerJson: JSON.stringify({
          email: order.email, name: `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim(),
        }),
        productTitle: item.title ?? variant?.group.title ?? "SMM",
        variantLabel: item.variant_title ?? variant?.label ?? null,
        optionsJson: JSON.stringify(props),
        targetLink,
        quantity: variant?.quantity ?? Number(item.quantity ?? 1),
        refill: variant?.refill ?? null,
        providerServiceId: variant?.providerServiceId ?? null,
      },
    });
    created++;
  }

  if (created > 0) await log("smm", `Webhook: ${created} SMM siparişi kuyruğa eklendi (${order.name})`);
  return NextResponse.json({ ok: true, created });
}

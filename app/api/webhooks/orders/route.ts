import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { processPaidSmmOrder, verifyShopifyWebhook } from "@/lib/smm-automation";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    await log("smm", "Shopify webhook HMAC verification failed", "warn");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const order = JSON.parse(raw);
  const result = await processPaidSmmOrder(order);
  return NextResponse.json({ ok: true, ...result });
}

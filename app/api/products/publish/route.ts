import { NextRequest, NextResponse } from "next/server";
import { publishToShopify, startJob, finishJob } from "@/lib/sync";
import { log } from "@/lib/logger";

export const maxDuration = 300;

function skuAt(start: string | undefined, index: number) {
  const raw = (start ?? "").trim();
  if (!raw) return undefined;
  const match = raw.match(/^(.*?)(\d+)$/);
  if (!match) return index === 0 ? raw : `${raw}-${index + 1}`;
  const [, prefix, digits] = match;
  return `${prefix}${String(Number(digits) + index).padStart(digits.length, "0")}`;
}

export async function POST(req: NextRequest) {
  const { ids, status, options = {} } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });
  }
  const job = await startJob("publish", ids.length);
  let success = 0, failed = 0;
  const errors: string[] = [];
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    try {
      await publishToShopify(id, status, {
        sku: skuAt(options.skuStart, index),
        vendor: options.vendor || undefined,
        templateSuffix: options.templateSuffix ?? undefined,
        requiresShipping: typeof options.requiresShipping === "boolean" ? options.requiresShipping : undefined,
        trackInventory: typeof options.trackInventory === "boolean" ? options.trackInventory : undefined,
        saveOptions: Boolean(options.saveOptions),
      });
      success++;
    } catch (e: any) {
      failed++;
      errors.push(e.message);
      await log("shopify", `Yayınlama hatası (${id}): ${e.message}`, "error");
    }
  }
  await finishJob(job.id, success, failed, errors.slice(0, 5).join(" | "));
  return NextResponse.json({ success, failed, errors: errors.slice(0, 5) });
}

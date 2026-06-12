import { NextRequest, NextResponse } from "next/server";
import { publishToShopify, startJob, finishJob } from "@/lib/sync";
import { log } from "@/lib/logger";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });
  }
  const job = await startJob("publish", ids.length);
  let success = 0, failed = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await publishToShopify(id, status);
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

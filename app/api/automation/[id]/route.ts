// Otomasyon-hazır modül: varsayılan KAPALI. Test gönderimi + ayarlar.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ctxFromSupplier } from "@/lib/connectors";
import { submitSmmOrder } from "@/lib/connectors/smm";
import { log } from "@/lib/logger";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if ("enabled" in b) data.enabled = Boolean(b.enabled);
  if (b.mode) data.mode = b.mode;
  if ("supplierId" in b) data.supplierId = b.supplierId || null;
  await prisma.automationConfig.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

// Test gönderimi: minimum miktarla deneme siparişi (sandbox yoksa gerçek API'ye en küçük sipariş — dikkat!)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const cfg = await prisma.automationConfig.findUniqueOrThrow({ where: { id: params.id }, include: { group: { include: { variants: true } } } });
  if (!cfg.supplierId) return NextResponse.json({ error: "Önce SMM tedarikçisi seç" }, { status: 400 });
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: cfg.supplierId } });
  const variant = cfg.group.variants[0];
  if (!variant) return NextResponse.json({ error: "Grupta varyant yok" }, { status: 400 });
  if (!b.testLink) return NextResponse.json({ error: "testLink gerekli" }, { status: 400 });

  try {
    const res = await submitSmmOrder(ctxFromSupplier(supplier), {
      service: variant.providerServiceId,
      link: b.testLink,
      quantity: b.quantity ?? 10,
    });
    await prisma.automationConfig.update({
      where: { id: cfg.id },
      data: { lastTestAt: new Date(), lastTestResult: JSON.stringify(res).slice(0, 2000) },
    });
    await log("smm", `Otomasyon testi (${cfg.group.title}): ${JSON.stringify(res).slice(0, 300)}`);
    return NextResponse.json({ ok: true, response: res });
  } catch (e: any) {
    await prisma.automationConfig.update({
      where: { id: cfg.id },
      data: { lastTestAt: new Date(), lastTestResult: `HATA: ${e.message}` },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

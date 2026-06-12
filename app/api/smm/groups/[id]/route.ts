import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jput } from "@/lib/json";
import { publishProduct } from "@/lib/shopify";
import { log } from "@/lib/logger";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["title", "platform", "descriptionHtml", "status"]) if (k in b) data[k] = b[k];
  if (b.requiredFields) data.requiredFieldsJson = jput(b.requiredFields);
  await prisma.smmGroup.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.smmGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// Varyant ekle: PUT
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  if (b.deleteVariantId) {
    await prisma.smmVariant.delete({ where: { id: b.deleteVariantId } });
    return NextResponse.json({ ok: true });
  }
  const label = [b.quantity, b.country, b.refill ? `${b.refill}g refill` : null, b.speed].filter(Boolean).join(" / ");
  const v = await prisma.smmVariant.create({
    data: {
      groupId: params.id,
      label,
      quantity: Number(b.quantity ?? 0),
      country: b.country || null,
      refill: b.refill || null,
      speed: b.speed || null,
      providerServiceId: String(b.providerServiceId ?? ""),
      supplierId: b.supplierId || null,
      costPrice: Number(b.costPrice ?? 0),
      price: Number(b.price ?? 0),
    },
  });
  return NextResponse.json({ id: v.id });
}

// Shopify'a yayınla: POST — seçenekli tek ürün, her kombinasyon bir varyant
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await prisma.smmGroup.findUniqueOrThrow({ where: { id: params.id }, include: { variants: { where: { active: true } } } });
  if (g.variants.length === 0) return NextResponse.json({ error: "Önce varyant ekle" }, { status: 400 });
  if (!g.logoUrl) await log("smm", `${g.title}: logo eksik — Logo Yöneticisi'nden ${g.platform} logosu yükle`, "warn");

  const hasCountry = g.variants.some(v => v.country);
  const hasRefill = g.variants.some(v => v.refill);
  const hasSpeed = g.variants.some(v => v.speed);
  const optionNames = ["Paket", ...(hasCountry ? ["Ülke/Tip"] : []), ...(hasRefill ? ["Refill"] : []), ...(hasSpeed ? ["Hız"] : [])];

  const variants = g.variants.map(v => ({
    title: v.label,
    sku: `SMM-${v.id}`,
    price: v.price,
    options: [
      String(v.quantity),
      ...(hasCountry ? [v.country ?? "Global"] : []),
      ...(hasRefill ? [v.refill ? `${v.refill} gün` : "Yok"] : []),
      ...(hasSpeed ? [v.speed ?? "Normal"] : []),
    ],
  }));

  try {
    const result = await publishProduct({
      title: g.title,
      descriptionHtml: g.descriptionHtml ?? `<p>${g.title}</p>`,
      vendor: "Engrace SMM",
      productType: "SMM Service",
      tags: ["smm", g.platform],
      status: "DRAFT",
      sku: `SMMG-${g.id}`,
      price: variants[0].price,
      compareAtPrice: null,
      inventoryQty: 0,
      images: g.logoUrl ? [`${process.env.APP_PUBLIC_URL ?? ""}${g.logoUrl}`].filter(u => u.startsWith("http")) : [],
      metafields: [
        { key: "smm_group_id", value: g.id },
        { key: "required_fields", value: g.requiredFieldsJson },
      ],
      existingShopifyId: g.shopifyProductId,
      variants,
      optionNames,
    });
    await prisma.smmGroup.update({ where: { id: g.id }, data: { shopifyProductId: result.productId, status: "published" } });
    await log("smm", `SMM grubu yayınlandı: ${g.title} (${variants.length} varyant)`);
    return NextResponse.json({ ok: true, productId: result.productId });
  } catch (e: any) {
    await log("smm", `SMM yayın hatası: ${e.message}`, "error");
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

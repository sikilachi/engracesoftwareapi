import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EDITABLE = [
  "title","description","shortDescription","usageInstructions","activationInstructions",
  "platform","region","language","edition","licenseType","deliveryType","activationType",
  "supplierCategory","sku","seoTitle","seoDescription","publishStatus","state",
  "imagesJson","tagsJson","collectionsJson","stockRuleJson",
  "syncPrice","syncStock","syncTitle","syncDescription","syncImages","protectEdits",
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in b) data[k] = b[k];
  if ("priceOverride" in b) data.priceOverride = b.priceOverride === null || b.priceOverride === "" ? null : Number(b.priceOverride);
  if (Object.keys(data).length > 0) data.manuallyEdited = true;
  await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  // sadece uygulamadan siler, Shopify'a dokunmaz
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePlatform } from "@/lib/smm-platforms";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["shopifyProductId", "shopifyVariantId", "serviceType", "country", "gender", "speed", "quality", "providerId", "providerServiceId"]) {
    if (key in b) data[key] = b[key] ? String(b[key]).trim() : null;
  }
  if ("platform" in b) data.platform = normalizePlatform(b.platform);
  for (const key of ["refillDays", "minQuantity", "maxQuantity", "costPer1000", "salePricePer1000", "priority"]) {
    if (key in b) data[key] = b[key] === "" || b[key] == null ? null : Number(b[key]);
  }
  if ("active" in b) data.active = Boolean(b.active);
  await prisma.smmServiceMapping.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.smmServiceMapping.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

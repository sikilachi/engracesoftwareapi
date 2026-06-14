import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePlatform } from "@/lib/smm-platforms";

function payload(b: any) {
  return {
    shopifyProductId: String(b.shopifyProductId ?? ""),
    shopifyVariantId: b.shopifyVariantId ? String(b.shopifyVariantId) : null,
    platform: normalizePlatform(b.platform),
    serviceType: String(b.serviceType ?? "").trim().toLowerCase(),
    country: b.country ? String(b.country).trim() : null,
    gender: b.gender ? String(b.gender).trim() : null,
    refillDays: b.refillDays !== "" && b.refillDays != null ? Number(b.refillDays) : null,
    speed: b.speed ? String(b.speed).trim() : null,
    quality: b.quality ? String(b.quality).trim() : null,
    minQuantity: Number(b.minQuantity ?? 1),
    maxQuantity: Number(b.maxQuantity ?? 1000000),
    providerId: String(b.providerId ?? ""),
    providerServiceId: String(b.providerServiceId ?? ""),
    costPer1000: Number(b.costPer1000 ?? 0),
    salePricePer1000: Number(b.salePricePer1000 ?? 0),
    active: b.active !== false,
    priority: Number(b.priority ?? 0),
  };
}

export async function GET() {
  const mappings = await prisma.smmServiceMapping.findMany({
    include: { provider: { select: { id: true, name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
  return NextResponse.json({ mappings });
}

export async function POST(req: NextRequest) {
  const data = payload(await req.json());
  if (!data.shopifyProductId || !data.platform || !data.serviceType || !data.providerId || !data.providerServiceId) {
    return NextResponse.json({ error: "product, platform, service type, provider and service id are required" }, { status: 400 });
  }
  const mapping = await prisma.smmServiceMapping.create({ data });
  return NextResponse.json({ id: mapping.id });
}

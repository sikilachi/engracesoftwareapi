import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jput } from "@/lib/json";

// SMM grubu (müşteriye görünen tek ürün) + varyantlar (servis eşlemeleri)
export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.title || !b.platform) return NextResponse.json({ error: "title ve platform zorunlu" }, { status: 400 });
  const logo = await prisma.logoAsset.findUnique({ where: { platform: b.platform } });
  const group = await prisma.smmGroup.create({
    data: {
      title: b.title,
      platform: b.platform,
      descriptionHtml: b.descriptionHtml ?? null,
      requiredFieldsJson: jput(b.requiredFields ?? ["Hedef Link"]),
      logoUrl: logo?.url ?? null,
      automation: { create: {} }, // otomasyon kaydı hazır ama KAPALI
    },
  });
  return NextResponse.json({ id: group.id, missingLogo: !logo });
}

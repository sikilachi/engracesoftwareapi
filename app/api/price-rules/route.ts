import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const b = await req.json();
  const rule = await prisma.priceRule.create({
    data: {
      name: b.name ?? "Kural",
      scope: b.scope ?? "global",
      supplierId: b.supplierId || null,
      category: b.category || null,
      productId: b.productId || null,
      markupType: b.markupType ?? "percent",
      markupValue: Number(b.markupValue ?? 30),
      minProfit: Number(b.minProfit ?? 0),
      rounding: b.rounding ?? "charm99",
      compareAtMultiplier: b.compareAtMultiplier ? Number(b.compareAtMultiplier) : null,
      priority: Number(b.priority ?? 0),
      active: b.active ?? true,
    },
  });
  return NextResponse.json({ id: rule.id });
}

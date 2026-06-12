import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jput } from "@/lib/json";

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.supplierCategory || !b.shopifyCollection) {
    return NextResponse.json({ error: "supplierCategory ve shopifyCollection zorunlu" }, { status: 400 });
  }
  const m = await prisma.categoryMapping.create({
    data: {
      supplierId: b.supplierId || null,
      supplierCategory: b.supplierCategory,
      shopifyCollection: b.shopifyCollection,
      autoTagsJson: jput(b.autoTags ?? []),
    },
  });
  return NextResponse.json({ id: m.id });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  await prisma.categoryMapping.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

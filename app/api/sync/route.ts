import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncProducts } from "@/lib/sync";

export const maxDuration = 300;

// body: { ids?: string[], supplierId?: string, all?: boolean, what: "stock"|"price"|"both" }
export async function POST(req: NextRequest) {
  const b = await req.json();
  let ids: string[] = b.ids ?? [];
  if (b.all) {
    ids = (await prisma.product.findMany({ select: { id: true } })).map(p => p.id);
  } else if (b.supplierId) {
    ids = (await prisma.product.findMany({ where: { supplierId: b.supplierId }, select: { id: true } })).map(p => p.id);
  }
  if (ids.length === 0) return NextResponse.json({ error: "Senkronlanacak ürün yok" }, { status: 400 });
  const result = await syncProducts(ids, b.what ?? "both");
  return NextResponse.json(result);
}

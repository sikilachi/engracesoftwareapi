import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jput } from "@/lib/json";

// Toplu işlemler: edit / kategori / koleksiyon / etiket / sil / durum
export async function POST(req: NextRequest) {
  const { ids, action, payload } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });
  }

  switch (action) {
    case "delete":
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      break;
    case "set_category":
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { supplierCategory: payload.category, manuallyEdited: true } });
      break;
    case "set_collections":
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { collectionsJson: jput(payload.collections ?? []), manuallyEdited: true } });
      break;
    case "set_tags": {
      for (const id of ids) {
        await prisma.product.update({ where: { id }, data: { tagsJson: jput(payload.tags ?? []), manuallyEdited: true } });
      }
      break;
    }
    case "set_status":
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { publishStatus: payload.status } });
      break;
    case "set_state":
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { state: payload.state } });
      break;
    default:
      return NextResponse.json({ error: `Bilinmeyen işlem: ${action}` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, count: ids.length });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnector, ctxFromSupplier } from "@/lib/connectors";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");

  try {
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: params.id } });
    const connector = getConnector(supplier.type);
    if (!connector.browseByCategory) {
      return NextResponse.json({ error: "Bu tedarikçi kategori browse'u desteklemiyor" }, { status: 400 });
    }
    const products = await connector.browseByCategory(ctxFromSupplier(supplier), category, { page, limit: 100 });
    return NextResponse.json({ products, supplierName: supplier.name, supplierType: supplier.type });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

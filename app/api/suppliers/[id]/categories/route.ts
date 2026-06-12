import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnector, ctxFromSupplier } from "@/lib/connectors";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: params.id } });
    const connector = getConnector(supplier.type);
    if (!connector.fetchCategories) {
      return NextResponse.json({ error: "Bu tedarikçi kategori listesini desteklemiyor" }, { status: 400 });
    }
    const categories = await connector.fetchCategories(ctxFromSupplier(supplier));
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

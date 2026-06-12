import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnector, ctxFromSupplier } from "@/lib/connectors";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!query.trim()) return NextResponse.json({ products: [] });

  try {
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: params.id } });
    const connector = getConnector(supplier.type);
    if (!connector.search) {
      return NextResponse.json({ error: "Bu tedarikçi arama desteklemiyor" }, { status: 400 });
    }
    const products = await connector.search(ctxFromSupplier(supplier), query);
    return NextResponse.json({ products });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

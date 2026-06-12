import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnector, ctxFromSupplier } from "@/lib/connectors";
import { log } from "@/lib/logger";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const s = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!s) return NextResponse.json({ error: "Tedarikçi bulunamadı" }, { status: 404 });
  const result = await getConnector(s.type).test(ctxFromSupplier(s));
  await prisma.supplier.update({
    where: { id: s.id },
    data: { status: result.ok ? "ok" : "error", healthMessage: result.message },
  });
  await log("api", `Bağlantı testi (${s.name}): ${result.message}`, result.ok ? "info" : "error");
  return NextResponse.json(result);
}

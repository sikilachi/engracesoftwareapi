import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  await prisma.priceRule.update({ where: { id: params.id }, data: b });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.priceRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

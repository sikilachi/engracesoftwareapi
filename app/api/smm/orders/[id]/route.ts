import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.status) data.status = b.status;
  if ("notes" in b) data.notes = b.notes;
  await prisma.smmOrder.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

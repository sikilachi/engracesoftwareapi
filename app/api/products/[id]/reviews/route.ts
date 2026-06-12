import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const reviews = await prisma.review.findMany({
    where: { productId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reviews });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.review.deleteMany({ where: { productId: params.id } });
  return NextResponse.json({ ok: true });
}

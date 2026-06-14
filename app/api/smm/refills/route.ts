import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRefillRequest } from "@/lib/smm-automation";

export async function GET() {
  const refills = await prisma.smmRefillRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ refills });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.smmOrderId) return NextResponse.json({ error: "smmOrderId is required" }, { status: 400 });
  try {
    const refill = await createRefillRequest(String(b.smmOrderId), b.notes ? String(b.notes) : undefined);
    return NextResponse.json({ ok: true, id: refill.id, status: refill.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

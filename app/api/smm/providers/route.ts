import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const providers = await prisma.smmProvider.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ providers });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.baseUrl || !b.apiKey) {
    return NextResponse.json({ error: "name, baseUrl and apiKey are required" }, { status: 400 });
  }
  const provider = await prisma.smmProvider.create({
    data: {
      name: String(b.name),
      baseUrl: String(b.baseUrl),
      apiKeyEnc: encrypt(String(b.apiKey)),
      active: b.active !== false,
    },
  });
  return NextResponse.json({ id: provider.id });
}

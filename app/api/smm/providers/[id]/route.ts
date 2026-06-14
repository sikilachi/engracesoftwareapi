import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = String(b.name);
  if ("baseUrl" in b) data.baseUrl = String(b.baseUrl);
  if ("active" in b) data.active = Boolean(b.active);
  if (b.apiKey) data.apiKeyEnc = encrypt(String(b.apiKey));
  await prisma.smmProvider.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.smmProvider.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

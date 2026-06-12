import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.name) data.name = b.name;
  if (b.baseUrl) data.baseUrl = b.baseUrl;
  if (b.apiKey) data.apiKeyEnc = encrypt(b.apiKey);
  if (b.apiSecret) data.apiSecretEnc = encrypt(b.apiSecret);
  if (b.configJson !== undefined) data.configJson = b.configJson;
  await prisma.supplier.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

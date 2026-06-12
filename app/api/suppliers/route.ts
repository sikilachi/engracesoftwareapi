import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { log } from "@/lib/logger";
import { SUPPLIER_DEFAULT_URLS } from "@/lib/connectors";

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.type || !b.apiKey) {
    return NextResponse.json({ error: "name, type ve apiKey zorunlu" }, { status: 400 });
  }
  const supplier = await prisma.supplier.create({
    data: {
      name: b.name,
      type: b.type,
      baseUrl: b.baseUrl || SUPPLIER_DEFAULT_URLS[b.type] || "",
      apiKeyEnc: encrypt(b.apiKey),
      apiSecretEnc: b.apiSecret ? encrypt(b.apiSecret) : null,
      configJson: b.configJson || null,
    },
  });
  await log("api", `Tedarikçi eklendi: ${b.name}`);
  return NextResponse.json({ id: supplier.id });
}

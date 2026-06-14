import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { testSmmProvider } from "@/lib/smm-provider-api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const provider = await prisma.smmProvider.findUnique({ where: { id: params.id } });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  try {
    const result = await testSmmProvider(provider);
    await prisma.smmProvider.update({
      where: { id: provider.id },
      data: {
        status: "ok",
        healthMessage: result.message,
        balance: result.balance,
        currency: result.currency,
        lastCheckedAt: new Date(),
      },
    });
    return NextResponse.json(result);
  } catch (e: any) {
    await prisma.smmProvider.update({ where: { id: provider.id }, data: { status: "error", healthMessage: e.message, lastCheckedAt: new Date() } });
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}

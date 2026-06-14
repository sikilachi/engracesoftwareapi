import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchSmmProviderServices } from "@/lib/smm-provider-api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const provider = await prisma.smmProvider.findUnique({ where: { id: params.id } });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  const services = await fetchSmmProviderServices(provider);
  let saved = 0;
  for (const service of services) {
    await prisma.smmProviderService.upsert({
      where: { providerId_providerServiceId: { providerId: provider.id, providerServiceId: service.providerServiceId } },
      update: service,
      create: { ...service, providerId: provider.id },
    });
    saved++;
  }
  await prisma.smmProvider.update({ where: { id: provider.id }, data: { status: "ok", healthMessage: `Imported ${saved} services` } });
  return NextResponse.json({ ok: true, saved });
}

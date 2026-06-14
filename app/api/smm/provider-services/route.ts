import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { norm, normalizePlatform } from "@/lib/smm-platforms";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const platform = normalizePlatform(sp.get("platform"));
  const serviceType = norm(sp.get("serviceType"));
  const q = norm(sp.get("q"));
  const services = await prisma.smmProviderService.findMany({
    where: {
      ...(platform ? { platform } : {}),
      ...(serviceType ? { serviceType } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { provider: { select: { id: true, name: true, active: true } } },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
    take: 300,
  });
  return NextResponse.json({ services });
}

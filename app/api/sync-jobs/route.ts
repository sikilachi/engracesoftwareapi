import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const types = searchParams.get("types")?.split(",").map(t => t.trim()).filter(Boolean);
  const after = searchParams.get("after");

  const job = await prisma.syncJob.findFirst({
    where: {
      ...(types?.length ? { type: { in: types } } : {}),
      ...(after ? { createdAt: { gte: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    job ? {
      id: job.id,
      type: job.type,
      status: job.status,
      total: job.total,
      success: job.success,
      failed: job.failed,
      detail: job.detail,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    } : { job: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

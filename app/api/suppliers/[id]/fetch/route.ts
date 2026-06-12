import { NextRequest, NextResponse } from "next/server";
import { fetchFromSupplier } from "@/lib/sync";

export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = await req.json().catch(() => ({}));
  try {
    const result = await fetchFromSupplier(params.id, { pages: b.pages ?? 1, limit: b.limit ?? 100 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

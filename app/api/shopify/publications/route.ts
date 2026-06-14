import { NextResponse } from "next/server";
import { listPublications } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publications = await listPublications();
    return NextResponse.json({ publications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

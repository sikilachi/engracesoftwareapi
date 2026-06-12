import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  return NextResponse.json(await getSettings());
}
export async function POST(req: NextRequest) {
  const b = await req.json();
  const next = await saveSettings(b);
  return NextResponse.json(next);
}

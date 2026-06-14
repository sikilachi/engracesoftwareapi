import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

function hex(value: unknown, fallback: string) {
  const v = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

export async function GET() {
  return NextResponse.json(await getSettings());
}
export async function POST(req: NextRequest) {
  const b = await req.json();
  const current = await getSettings();
  const next = await saveSettings({
    ...b,
    appName: String(b.appName ?? current.appName).trim().slice(0, 60) || current.appName,
    appSubtitle: String(b.appSubtitle ?? current.appSubtitle).trim().slice(0, 60) || current.appSubtitle,
    appLogoUrl: String(b.appLogoUrl ?? current.appLogoUrl).trim().slice(0, 500),
    accentColor: hex(b.accentColor, current.accentColor),
    sidebarColor: hex(b.sidebarColor, current.sidebarColor),
  });
  return NextResponse.json(next);
}

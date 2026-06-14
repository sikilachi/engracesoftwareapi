import { NextRequest, NextResponse } from "next/server";
import { syncSmmOrderStatuses } from "@/lib/smm-automation";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await syncSmmOrderStatuses()) });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

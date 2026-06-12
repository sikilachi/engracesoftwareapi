import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const shop = req.nextUrl.searchParams.get("shop");

  if (!code || !shop) {
    return new NextResponse("Missing code or shop", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const data = await res.json() as { access_token?: string; error?: string };

  if (!data.access_token) {
    return new NextResponse(`Token alınamadı: ${JSON.stringify(data)}`, { status: 400 });
  }

  return new NextResponse(
    `<html><body style="font-family:monospace;padding:40px;background:#111;color:#0f0">
      <h2 style="color:#fff">Admin Token:</h2>
      <p style="font-size:18px;word-break:break-all">${data.access_token}</p>
      <p style="color:#aaa">Bu token'ı kopyala ve Vercel env vars'a SHOPIFY_ADMIN_TOKEN olarak ekle.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

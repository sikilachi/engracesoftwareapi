import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

const ANTHROPIC_API_KEY = () => process.env.ANTHROPIC_API_KEY ?? "";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = ANTHROPIC_API_KEY();
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY eksik" }, { status: 500 });

  const { count = 5 } = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(count) || 5, 1), 20);

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  const prompt = `You are generating test review data for an e-commerce store.

Product: "${product.title}"
Platform: ${product.platform ?? "Digital"}
Region: ${product.region ?? "Global"}

Generate ${n} realistic customer reviews in ENGLISH for this product.
Use varied ratings (mostly 4-5 stars, occasionally 3 or lower).
Each review should feel like it's from a different real customer.
Use common English first names with last initial (e.g. "James K.", "Sarah M.").

Reply with ONLY valid JSON in the format below, nothing else:
[
  {
    "author": "James K.",
    "rating": 5,
    "title": "Great product",
    "body": "Review text here..."
  }
]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Claude API hatası: ${err.slice(0, 200)}` }, { status: 500 });
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "[]";

  let parsed: { author: string; rating: number; title?: string; body: string }[] = [];
  try {
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? "[]";
    parsed = JSON.parse(json);
  } catch {
    return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
  }

  const created = await prisma.$transaction(
    parsed.map(r =>
      prisma.review.create({
        data: {
          productId: params.id,
          author: r.author ?? "Kullanıcı",
          rating: Math.min(Math.max(Math.round(Number(r.rating) || 5), 1), 5),
          title: r.title ?? null,
          body: r.body ?? "",
          isAiGenerated: true,
        },
      })
    )
  );

  return NextResponse.json({ reviews: created, count: created.length });
}

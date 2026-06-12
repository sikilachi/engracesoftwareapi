import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Logo paketi yükleme: platform adı + dosya → public/logos/
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const platform = String(form.get("platform") ?? "").toLowerCase().trim();
  const file = form.get("file") as File | null;
  if (!platform || !file) return NextResponse.json({ error: "platform ve dosya zorunlu" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  if (!["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
    return NextResponse.json({ error: "Sadece png, jpg, webp, svg desteklenir" }, { status: 400 });
  }
  const dir = path.join(process.cwd(), "public", "logos");
  await mkdir(dir, { recursive: true });
  const filename = `${platform}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const url = `/logos/${filename}`;
  await prisma.logoAsset.upsert({
    where: { platform },
    create: { platform, filename, url },
    update: { filename, url },
  });
  // bu platformdaki SMM gruplarına otomatik ata
  await prisma.smmGroup.updateMany({ where: { platform }, data: { logoUrl: url } });
  return NextResponse.json({ ok: true, url });
}

export async function DELETE(req: NextRequest) {
  const platform = new URL(req.url).searchParams.get("platform");
  if (!platform) return NextResponse.json({ error: "platform gerekli" }, { status: 400 });
  await prisma.logoAsset.delete({ where: { platform } });
  return NextResponse.json({ ok: true });
}

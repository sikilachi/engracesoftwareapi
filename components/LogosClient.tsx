"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

export default function LogosClient({ logos, missing }: {
  logos: { platform: string; url: string; filename: string }[]; missing: string[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    if (!platform.trim() || !file) return setMsg("Platform adı ve dosya gerekli");
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append("platform", platform.trim().toLowerCase());
    fd.append("file", file);
    const res = await fetch("/api/logos", { method: "POST", body: fd });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Hata");
    setPlatform(""); setFile(null);
    setMsg("Logo yüklendi ve gruplara atandı");
    router.refresh();
  }

  async function del(p: string) {
    if (!confirm(`${p} logosu silinsin mi? (Gruplardaki atama kalır, dosya kaydı silinir)`)) return;
    await fetch(`/api/logos?platform=${p}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
        {missing.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Logosu eksik platformlar: <strong>{missing.join(", ")}</strong> — tıkla, forma dolsun:{" "}
            {missing.map(m => <button key={m} className="badge mr-1 bg-white text-amber-700" onClick={() => setPlatform(m)}>{m}</button>)}
          </div>
        ) : null}
        {logos.length === 0 ? (
          <Empty title="Henüz logo yok" hint="Instagram, TikTok vb. platform logolarını yükle; SMM ürünlerinin görseli olarak kullanılır." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            {logos.map(l => (
              <div key={l.platform} className="card p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.url} alt={l.platform} className="mx-auto h-16 w-16 rounded-xl border border-line object-contain" />
                <p className="mt-2 text-sm font-semibold capitalize">{l.platform}</p>
                <p className="text-xs text-muted">{l.filename}</p>
                <button className="mt-2 text-xs font-semibold text-danger hover:underline" onClick={() => del(l.platform)}>Sil</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card h-fit space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Logo yükle</h2>
        <div><label className="label">Platform adı</label><input className="input" placeholder="instagram" value={platform} onChange={e => setPlatform(e.target.value)} /></div>
        <div>
          <label className="label">Dosya (png, jpg, webp, svg)</label>
          <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-pine-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-pine-700"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {file ? <Badge tone="green">{file.name}</Badge> : null}
        <button className="btn-primary w-full" disabled={busy} onClick={upload}>{busy ? "Yükleniyor…" : "Yükle"}</button>
        <p className="text-xs text-muted">Aynı platforma tekrar yüklersen üzerine yazar.</p>
      </div>
    </div>
  );
}

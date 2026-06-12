"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type C = {
  id: string; enabled: boolean; mode: string; supplierId: string | null;
  lastTestAt: string | null; lastTestResult: string | null;
  groupTitle: string; groupPlatform: string; variantCount: number;
};

export default function AutomationClient({ configs, suppliers }: { configs: C[]; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [testLink, setTestLink] = useState<Record<string, string>>({});

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/automation/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }

  async function test(c: C) {
    const link = testLink[c.id]?.trim();
    if (!link) return setMsg("Test için bir hedef link gir");
    if (!confirm("DİKKAT: Sandbox yoksa bu GERÇEK bir sipariş oluşturur (en küçük miktarla). Devam?")) return;
    setBusy("test" + c.id); setMsg(null);
    const res = await fetch(`/api/automation/${c.id}`, { method: "POST", body: JSON.stringify({ testLink: link, quantity: 10 }) });
    const d = await res.json();
    setBusy(null);
    setMsg(res.ok ? "Test gönderildi — sonucu kartta görürsün" : d.error ?? "Test hatası");
    router.refresh();
  }

  if (configs.length === 0) {
    return <Empty title="Otomasyon yapılandırması yok" hint="Önce SMM Hizmetleri sayfasından bir grup oluştur; otomasyon kaydı otomatik açılır (kapalı olarak)." />;
  }

  return (
    <div className="space-y-4">
      {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Bu modül "otomasyon-hazır" olarak kuruldu: webhook dinleyici aktif, sipariş gönderimi <strong>kapalı</strong>.
        Önce manuel akışla birkaç sipariş işle, panel cevaplarını test et, sonra grupları tek tek aç.
      </div>
      {configs.map(c => (
        <div key={c.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{c.groupTitle}</p>
              <p className="text-xs text-muted">{c.groupPlatform} · {c.variantCount} varyant</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={c.enabled ? "green" : "neutral"}>{c.enabled ? "AÇIK" : "KAPALI"}</Badge>
              <button className={c.enabled ? "btn-danger" : "btn-primary"} disabled={busy !== null}
                onClick={() => patch(c.id, { enabled: !c.enabled })}>
                {c.enabled ? "Kapat" : "Aç"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-3">
            <div>
              <label className="label">Mod</label>
              <select className="input" value={c.mode} disabled={busy !== null} onChange={e => patch(c.id, { mode: e.target.value })}>
                <option value="manual_approval">Manuel onay (önerilen)</option>
                <option value="auto_submit">Otomatik gönder</option>
              </select>
            </div>
            <div>
              <label className="label">SMM tedarikçisi</label>
              <select className="input" value={c.supplierId ?? ""} disabled={busy !== null} onChange={e => patch(c.id, { supplierId: e.target.value || null })}>
                <option value="">Seç…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Test gönderimi (gerçek API!)</label>
              <div className="flex gap-2">
                <input className="input" placeholder="https://instagram.com/hesap" value={testLink[c.id] ?? ""} onChange={e => setTestLink(x => ({ ...x, [c.id]: e.target.value }))} />
                <button className="btn-ghost whitespace-nowrap" disabled={busy !== null || !c.supplierId} onClick={() => test(c)}>
                  {busy === "test" + c.id ? "…" : "Test"}
                </button>
              </div>
            </div>
          </div>
          {c.lastTestAt ? (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-muted">Son test: {new Date(c.lastTestAt).toLocaleString("tr-TR")}</p>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs">{c.lastTestResult}</pre>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

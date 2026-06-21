"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui";
import LiveProgress from "./LiveProgress";

type S = { id: string; name: string; type: string; baseUrl: string; status: string; healthMessage: string | null; lastSyncAt: string | null; productCount: number };

const DEFAULT_URLS: Record<string, string> = {
  kinguin: "https://gateway.kinguin.net/esa/api",
  g2a: "https://api.g2a.com",
  smm: "https://smmturk.org/api/v2",
  custom: "",
};

export default function SuppliersClient({ suppliers }: { suppliers: S[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", type: "kinguin", baseUrl: DEFAULT_URLS.kinguin, apiKey: "", apiSecret: "", configJson: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<null | { types: string[]; startedAt: string; label: string }>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v, ...(k === "type" ? { baseUrl: DEFAULT_URLS[v] ?? "" } : {}) }));

  async function add() {
    setBusy("add"); setMsg(null);
    const res = await fetch("/api/suppliers", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setMsg(data.error);
    setForm({ name: "", type: "kinguin", baseUrl: DEFAULT_URLS.kinguin, apiKey: "", apiSecret: "", configJson: "" });
    setMsg("Tedarikçi eklendi");
    router.refresh();
  }

  async function action(id: string, kind: "test" | "fetch" | "delete") {
    setBusy(id + kind); setMsg(null);
    let res: Response;
    if (kind === "delete") {
      if (!confirm("Tedarikçi ve çekilen tüm ürünleri uygulamadan silinecek (Shopify etkilenmez). Emin misin?")) { setBusy(null); return; }
      res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    } else if (kind === "test") {
      res = await fetch(`/api/suppliers/${id}/test`, { method: "POST" });
    } else {
      setProgress({ types: ["fetch"], startedAt: new Date().toISOString(), label: "Ürün çekme" });
      res = await fetch(`/api/suppliers/${id}/fetch`, { method: "POST", body: JSON.stringify({ pages: 1, limit: 100 }) });
    }
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (kind === "fetch") setTimeout(() => setProgress(null), 1200);
    setMsg(kind === "test" ? data.message : kind === "fetch" ? `Çekildi: ${data.success ?? 0} ✓ / ${data.failed ?? 0} ✗` : "Silindi");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <LiveProgress active={!!progress} types={progress?.types ?? []} startedAt={progress?.startedAt ?? null} fallbackLabel={progress?.label} />
      <div className="space-y-3">
        {suppliers.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">Henüz tedarikçi yok. Sağdaki formdan ilkini ekle.</div>
        )}
        {suppliers.map(s => (
          <div key={s.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{s.name}</p>
                  <Badge tone="neutral">{s.type}</Badge>
                  <Badge tone={s.status === "ok" ? "green" : s.status === "error" ? "red" : "neutral"}>{s.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted break-all">{s.baseUrl}</p>
                <p className="text-xs text-muted">
                  {s.productCount} ürün · son senkron: {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString("tr-TR") : "—"}
                </p>
                {s.healthMessage && <p className={`mt-1 text-xs ${s.status === "error" ? "text-danger" : "text-pine-700"}`}>{s.healthMessage}</p>}
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" disabled={busy === s.id + "test"} onClick={() => action(s.id, "test")}>
                  {busy === s.id + "test" ? "Test ediliyor…" : "Bağlantıyı test et"}
                </button>
                <button className="btn-primary" disabled={busy === s.id + "fetch"} onClick={() => action(s.id, "fetch")}>
                  {busy === s.id + "fetch" ? "Çekiliyor…" : "Ürünleri çek"}
                </button>
                <button className="btn-danger" onClick={() => action(s.id, "delete")}>Sil</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 h-fit">
        <h2 className="font-bold text-sm mb-4">Yeni tedarikçi ekle</h2>
        <div className="space-y-3">
          <div><label className="label">Ad</label><input className="input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Kinguin Ana Hesap" /></div>
          <div>
            <label className="label">Tip</label>
            <select className="input" value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="kinguin">Kinguin</option>
              <option value="g2a">G2A</option>
              <option value="smm">SMM Panel (smmturk / Peakerr / JAP)</option>
              <option value="custom">Custom API</option>
            </select>
          </div>
          <div><label className="label">API Base URL</label><input className="input" value={form.baseUrl} onChange={e => set("baseUrl", e.target.value)} /></div>
          <div><label className="label">API Key</label><input className="input" type="password" value={form.apiKey} onChange={e => set("apiKey", e.target.value)} placeholder="Şifreli saklanır" /></div>
          <div><label className="label">API Secret (gerekirse)</label><input className="input" type="password" value={form.apiSecret} onChange={e => set("apiSecret", e.target.value)} /></div>
          {form.type === "custom" && (
            <div><label className="label">Config JSON (alan eşleme)</label>
              <textarea className="input font-mono text-xs" rows={4} value={form.configJson} onChange={e => set("configJson", e.target.value)}
                placeholder='{"listPath":"data.products","fields":{"id":"sku","title":"name","price":"cost","stock":"qty"},"authHeader":"X-Api-Key"}' />
            </div>
          )}
          <button className="btn-primary w-full justify-center" disabled={busy === "add" || !form.name || !form.apiKey} onClick={add}>
            {busy === "add" ? "Ekleniyor…" : "Tedarikçiyi ekle"}
          </button>
          {msg && <p className="text-xs text-pine-700 font-medium">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

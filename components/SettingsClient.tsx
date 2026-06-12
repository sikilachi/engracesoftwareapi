"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppSettings } from "@/lib/settings";

export default function SettingsClient({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [storeCurrency, setStoreCurrency] = useState(settings.storeCurrency);
  const [fx, setFx] = useState(
    Object.entries(settings.fxRates).map(([k, v]) => ({ cur: k, rate: String(v) }))
  );
  const [rule, setRule] = useState({
    mode: settings.stockRule.mode,
    divisor: String(settings.stockRule.divisor),
    cap: String(settings.stockRule.cap),
    min: String(settings.stockRule.min),
  });
  const [applyToSmm, setApplyToSmm] = useState(settings.applyStockRuleToSmm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    const fxRates: Record<string, number> = {};
    for (const r of fx) if (r.cur.trim()) fxRates[r.cur.trim().toUpperCase()] = Number(r.rate) || 0;
    const res = await fetch("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        storeCurrency: storeCurrency.trim().toUpperCase() || "EUR",
        fxRates,
        stockRule: { mode: rule.mode, divisor: Math.max(1, Number(rule.divisor) || 4), cap: Number(rule.cap) || 5, min: Number(rule.min) || 0 },
        applyStockRuleToSmm: applyToSmm,
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Kaydedildi" : "Hata");
    router.refresh();
  }

  // önizleme
  const preview = (src: number) => {
    let q = rule.mode === "passthrough" ? src : rule.mode === "fixed" ? Number(rule.cap) : Math.floor(src / Math.max(1, Number(rule.divisor) || 4));
    q = Math.min(q, Number(rule.cap) || 5);
    q = Math.max(q, src === 0 ? 0 : Number(rule.min) || 0);
    if (src === 0) q = 0;
    return q;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700 lg:col-span-2">{msg}</div> : null}

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Para birimi & kurlar</h2>
        <div>
          <label className="label">Mağaza para birimi</label>
          <input className="input max-w-[120px]" value={storeCurrency} onChange={e => setStoreCurrency(e.target.value)} />
        </div>
        <div>
          <label className="label">Kur tablosu (1 birim yabancı = X mağaza parası)</label>
          <div className="space-y-2">
            {fx.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className="input max-w-[100px]" value={r.cur} onChange={e => setFx(x => x.map((y, j) => j === i ? { ...y, cur: e.target.value } : y))} />
                <input className="input" type="number" step="0.0001" value={r.rate} onChange={e => setFx(x => x.map((y, j) => j === i ? { ...y, rate: e.target.value } : y))} />
                <button className="btn-ghost" onClick={() => setFx(x => x.filter((_, j) => j !== i))}>−</button>
              </div>
            ))}
            <button className="btn-ghost text-xs" onClick={() => setFx(x => [...x, { cur: "", rate: "1" }])}>+ Kur ekle</button>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Genel stok koruma kuralı</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mod</label>
            <select className="input" value={rule.mode} onChange={e => setRule(r => ({ ...r, mode: e.target.value as any }))}>
              <option value="divisor">Bölücü (kaynak ÷ N)</option>
              <option value="fixed">Sabit (her zaman cap)</option>
              <option value="passthrough">Aynen aktar</option>
            </select>
          </div>
          <div><label className="label">Bölücü</label><input className="input" type="number" min="1" value={rule.divisor} onChange={e => setRule(r => ({ ...r, divisor: e.target.value }))} /></div>
          <div><label className="label">Üst sınır (cap)</label><input className="input" type="number" value={rule.cap} onChange={e => setRule(r => ({ ...r, cap: e.target.value }))} /></div>
          <div><label className="label">Alt sınır (min)</label><input className="input" type="number" value={rule.min} onChange={e => setRule(r => ({ ...r, min: e.target.value }))} /></div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
          <span>SMM ürünlerine de uygula (genelde kapalı kalır)</span>
          <input type="checkbox" className="h-4 w-4 accent-pine-600" checked={applyToSmm} onChange={e => setApplyToSmm(e.target.checked)} />
        </label>
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Önizleme (kaynak → Shopify)</p>
          <div className="flex flex-wrap gap-3 tabular-nums">
            {[0, 3, 10, 50, 500].map(n => <span key={n}>{n} → <strong className="text-pine-700">{preview(n)}</strong></span>)}
          </div>
          <p className="mt-1 text-xs text-muted">Kaynak 0 ise Shopify her zaman 0 olur (yanlış satış koruması).</p>
        </div>
      </div>

      <div className="lg:col-span-2">
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
    </div>
  );
}

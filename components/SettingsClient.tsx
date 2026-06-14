"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppSettings } from "@/lib/settings";

function cleanHex(value: string, fallback: string) {
  const v = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

export default function SettingsClient({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [brand, setBrand] = useState({
    appName: settings.appName,
    appSubtitle: settings.appSubtitle,
    appLogoUrl: settings.appLogoUrl,
    accentColor: settings.accentColor,
    sidebarColor: settings.sidebarColor,
  });
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
    setBusy(true);
    setMsg(null);
    const fxRates: Record<string, number> = {};
    for (const r of fx) if (r.cur.trim()) fxRates[r.cur.trim().toUpperCase()] = Number(r.rate) || 0;
    const res = await fetch("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        appName: brand.appName.trim() || "Engrace",
        appSubtitle: brand.appSubtitle.trim() || "Software",
        appLogoUrl: brand.appLogoUrl.trim(),
        accentColor: cleanHex(brand.accentColor, settings.accentColor),
        sidebarColor: cleanHex(brand.sidebarColor, settings.sidebarColor),
        storeCurrency: storeCurrency.trim().toUpperCase() || "EUR",
        fxRates,
        stockRule: {
          mode: rule.mode,
          divisor: Math.max(1, Number(rule.divisor) || 4),
          cap: Number(rule.cap) || 5,
          min: Number(rule.min) || 0,
        },
        applyStockRuleToSmm: applyToSmm,
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Kaydedildi. Renk ve logo degisiklikleri sayfa yenilenince gorunur." : "Kayit hatasi");
    router.refresh();
  }

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

      <div className="card space-y-4 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Gorunum</h2>
            <p className="mt-1 text-sm text-muted">Sol panel logosu, uygulama adi ve ana renkler.</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
            {brand.appLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.appLogoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: brand.accentColor }}>
                {(brand.appName || "E").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{brand.appName || "Engrace"}</p>
              <p className="text-xs uppercase tracking-wide text-muted">{brand.appSubtitle || "Software"}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Uygulama adi</label><input className="input" value={brand.appName} onChange={e => setBrand(b => ({ ...b, appName: e.target.value }))} /></div>
          <div><label className="label">Alt baslik</label><input className="input" value={brand.appSubtitle} onChange={e => setBrand(b => ({ ...b, appSubtitle: e.target.value }))} /></div>
          <div className="md:col-span-2"><label className="label">Logo URL</label><input className="input" placeholder="https://.../logo.png veya /logos/logo.png" value={brand.appLogoUrl} onChange={e => setBrand(b => ({ ...b, appLogoUrl: e.target.value }))} /></div>
          <div>
            <label className="label">Ana vurgu rengi</label>
            <div className="flex gap-2"><input className="h-10 w-14 rounded-lg border border-line" type="color" value={brand.accentColor} onChange={e => setBrand(b => ({ ...b, accentColor: e.target.value }))} /><input className="input" value={brand.accentColor} onChange={e => setBrand(b => ({ ...b, accentColor: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Sol panel rengi</label>
            <div className="flex gap-2"><input className="h-10 w-14 rounded-lg border border-line" type="color" value={brand.sidebarColor} onChange={e => setBrand(b => ({ ...b, sidebarColor: e.target.value }))} /><input className="input" value={brand.sidebarColor} onChange={e => setBrand(b => ({ ...b, sidebarColor: e.target.value }))} /></div>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Para birimi ve kurlar</h2>
        <div>
          <label className="label">Magaza para birimi</label>
          <input className="input max-w-[120px]" value={storeCurrency} onChange={e => setStoreCurrency(e.target.value)} />
        </div>
        <div>
          <label className="label">Kur tablosu: 1 yabanci birim = X magaza parasi</label>
          <div className="space-y-2">
            {fx.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className="input max-w-[100px]" value={r.cur} onChange={e => setFx(x => x.map((y, j) => j === i ? { ...y, cur: e.target.value } : y))} />
                <input className="input" type="number" step="0.0001" value={r.rate} onChange={e => setFx(x => x.map((y, j) => j === i ? { ...y, rate: e.target.value } : y))} />
                <button className="btn-ghost" onClick={() => setFx(x => x.filter((_, j) => j !== i))}>-</button>
              </div>
            ))}
            <button className="btn-ghost text-xs" onClick={() => setFx(x => [...x, { cur: "", rate: "1" }])}>+ Kur ekle</button>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Genel stok koruma kurali</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mod</label>
            <select className="input" value={rule.mode} onChange={e => setRule(r => ({ ...r, mode: e.target.value as any }))}>
              <option value="divisor">Bolucu: kaynak / N</option>
              <option value="fixed">Sabit: her zaman cap</option>
              <option value="passthrough">Aynen aktar</option>
            </select>
          </div>
          <div><label className="label">Bolucu</label><input className="input" type="number" min="1" value={rule.divisor} onChange={e => setRule(r => ({ ...r, divisor: e.target.value }))} /></div>
          <div><label className="label">Ust sinir</label><input className="input" type="number" value={rule.cap} onChange={e => setRule(r => ({ ...r, cap: e.target.value }))} /></div>
          <div><label className="label">Alt sinir</label><input className="input" type="number" value={rule.min} onChange={e => setRule(r => ({ ...r, min: e.target.value }))} /></div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
          <span>SMM urunlerine de uygula</span>
          <input type="checkbox" className="h-4 w-4 accent-pine-600" checked={applyToSmm} onChange={e => setApplyToSmm(e.target.checked)} />
        </label>
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Onizleme: kaynak -&gt; Shopify</p>
          <div className="flex flex-wrap gap-3 tabular-nums">
            {[0, 3, 10, 50, 500].map(n => <span key={n}>{n} -&gt; <strong className="text-pine-700">{preview(n)}</strong></span>)}
          </div>
          <p className="mt-1 text-xs text-muted">Kaynak 0 ise Shopify stogu her zaman 0 olur.</p>
        </div>
      </div>

      <div className="lg:col-span-2">
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </div>
  );
}

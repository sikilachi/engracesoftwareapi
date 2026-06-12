"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type R = {
  id: string; name: string; scope: string; supplierId: string | null; category: string | null;
  productId: string | null; markupType: string; markupValue: number; minProfit: number;
  rounding: string; compareAtMultiplier: number | null; priority: number; active: boolean;
};

const SCOPE_TR: Record<string, string> = { global: "Genel", supplier: "Tedarikçi", category: "Kategori", product: "Ürün" };

export default function PriceRulesClient({ rules, suppliers, categories }: {
  rules: R[]; suppliers: { id: string; name: string }[]; categories: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", scope: "global", supplierId: "", category: "", productId: "",
    markupType: "percent", markupValue: "30", minProfit: "0", rounding: "charm99",
    compareAtMultiplier: "", priority: "0",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const sName = (id: string | null) => suppliers.find(s => s.id === id)?.name ?? "—";

  // örnek hesap: 10 birim maliyet için kural sonucu
  function preview(r: { markupType: string; markupValue: number; minProfit: number; rounding: string }, cost = 10) {
    let p = r.markupType === "percent" ? cost * (1 + r.markupValue / 100) : cost + r.markupValue;
    if (p - cost < r.minProfit) p = cost + r.minProfit;
    if (r.rounding === "charm99") { const f = Math.floor(p) + 0.99; p = f >= p ? f : Math.floor(p) + 1.99; }
    else if (r.rounding === "round") p = Math.ceil(p);
    return p.toFixed(2);
  }

  async function add() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/price-rules", {
      method: "POST",
      body: JSON.stringify({
        name: form.name || `${SCOPE_TR[form.scope]} kuralı`,
        scope: form.scope,
        supplierId: form.scope === "supplier" ? form.supplierId : null,
        category: form.scope === "category" ? form.category : null,
        productId: form.scope === "product" ? form.productId : null,
        markupType: form.markupType,
        markupValue: Number(form.markupValue),
        minProfit: Number(form.minProfit),
        rounding: form.rounding,
        compareAtMultiplier: form.compareAtMultiplier ? Number(form.compareAtMultiplier) : null,
        priority: Number(form.priority),
      }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json(); return setMsg(d.error ?? "Hata"); }
    setForm(f => ({ ...f, name: "" }));
    setMsg("Kural eklendi");
    router.refresh();
  }

  async function toggle(r: R) {
    await fetch(`/api/price-rules/${r.id}`, { method: "PATCH", body: JSON.stringify({ active: !r.active }) });
    router.refresh();
  }
  async function del(id: string) {
    if (!confirm("Kural silinsin mi?")) return;
    await fetch(`/api/price-rules/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
        {rules.length === 0 ? (
          <Empty title="Henüz fiyat kuralı yok" hint="Genel bir %30 kuralı ile başlamanı öneririm — sağdaki form hazır." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">Kural</th><th className="th">Kapsam</th><th className="th">Kâr</th><th className="th">Min kâr</th><th className="th">Yuvarlama</th><th className="th">Öncelik</th><th className="th">10→</th><th className="th" /></tr></thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className={`border-t border-line ${r.active ? "" : "opacity-50"}`}>
                    <td className="td font-medium">{r.name}</td>
                    <td className="td">
                      <Badge tone={r.scope === "global" ? "blue" : "neutral"}>{SCOPE_TR[r.scope] ?? r.scope}</Badge>
                      {r.scope === "supplier" ? <span className="ml-1 text-xs text-muted">{sName(r.supplierId)}</span> : null}
                      {r.scope === "category" ? <span className="ml-1 text-xs text-muted">{r.category}</span> : null}
                    </td>
                    <td className="td tabular-nums">{r.markupType === "percent" ? `%${r.markupValue}` : `+${r.markupValue}`}</td>
                    <td className="td tabular-nums">{r.minProfit}</td>
                    <td className="td text-xs">{r.rounding === "charm99" ? ".99" : r.rounding === "round" ? "Tam" : "Yok"}</td>
                    <td className="td tabular-nums">{r.priority}</td>
                    <td className="td tabular-nums text-pine-700">{preview(r)}</td>
                    <td className="td whitespace-nowrap text-right">
                      <button className="mr-3 text-xs font-semibold text-pine-700 hover:underline" onClick={() => toggle(r)}>{r.active ? "Kapat" : "Aç"}</button>
                      <button className="text-xs font-semibold text-danger hover:underline" onClick={() => del(r.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">"10→" sütunu: 10 birim maliyetli ürün için kuralın yaklaşık sonucu.</p>
      </div>

      <div className="card h-fit space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Yeni kural</h2>
        <div><label className="label">İsim</label><input className="input" placeholder="örn. Genel %30" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div>
          <label className="label">Kapsam</label>
          <select className="input" value={form.scope} onChange={e => set("scope", e.target.value)}>
            <option value="global">Genel (tüm ürünler)</option>
            <option value="supplier">Tedarikçi</option>
            <option value="category">Kategori</option>
            <option value="product">Tek ürün</option>
          </select>
        </div>
        {form.scope === "supplier" ? (
          <div><label className="label">Tedarikçi</label>
            <select className="input" value={form.supplierId} onChange={e => set("supplierId", e.target.value)}>
              <option value="">Seç…</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        ) : null}
        {form.scope === "category" ? (
          <div><label className="label">Kategori</label>
            <input className="input" list="cats" value={form.category} onChange={e => set("category", e.target.value)} />
            <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        ) : null}
        {form.scope === "product" ? (
          <div><label className="label">Ürün ID</label><input className="input" placeholder="Ürün detayından kopyala" value={form.productId} onChange={e => set("productId", e.target.value)} /></div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kâr tipi</label>
            <select className="input" value={form.markupType} onChange={e => set("markupType", e.target.value)}>
              <option value="percent">Yüzde %</option>
              <option value="fixed">Sabit tutar</option>
            </select>
          </div>
          <div><label className="label">Değer</label><input className="input" type="number" step="0.01" value={form.markupValue} onChange={e => set("markupValue", e.target.value)} /></div>
          <div><label className="label">Min kâr</label><input className="input" type="number" step="0.01" value={form.minProfit} onChange={e => set("minProfit", e.target.value)} /></div>
          <div><label className="label">Öncelik</label><input className="input" type="number" value={form.priority} onChange={e => set("priority", e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Yuvarlama</label>
          <select className="input" value={form.rounding} onChange={e => set("rounding", e.target.value)}>
            <option value="charm99">.99 (psikolojik)</option>
            <option value="round">Tam sayıya</option>
            <option value="none">Yok</option>
          </select>
        </div>
        <div><label className="label">Üstü çizili fiyat çarpanı (ops.)</label><input className="input" type="number" step="0.05" placeholder="örn. 1.3" value={form.compareAtMultiplier} onChange={e => set("compareAtMultiplier", e.target.value)} /></div>
        <button className="btn-primary w-full" disabled={busy} onClick={add}>{busy ? "Ekleniyor…" : "Kural ekle"}</button>
      </div>
    </div>
  );
}

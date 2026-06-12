"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type M = { id: string; supplierId: string | null; supplierCategory: string; shopifyCollection: string; autoTagsJson: string };

export default function MappingClient({ mappings, suppliers, categories }: {
  mappings: M[]; suppliers: { id: string; name: string }[]; categories: { name: string; count: number }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ supplierId: "", supplierCategory: "", shopifyCollection: "", autoTags: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const sName = (id: string | null) => suppliers.find(s => s.id === id)?.name ?? "Tüm tedarikçiler";

  async function add() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/mapping", {
      method: "POST",
      body: JSON.stringify({
        supplierId: form.supplierId || null,
        supplierCategory: form.supplierCategory.trim(),
        shopifyCollection: form.shopifyCollection.trim(),
        autoTags: form.autoTags.split(",").map(s => s.trim()).filter(Boolean),
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(d.error);
    setForm({ supplierId: "", supplierCategory: "", shopifyCollection: "", autoTags: "" });
    setMsg("Eşleme eklendi");
    router.refresh();
  }

  async function del(id: string) {
    await fetch(`/api/mapping?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
        {mappings.length === 0 ? (
          <Empty title="Henüz eşleme yok" hint="Sağdaki formla bir tedarikçi kategorisini Shopify koleksiyonuna bağla." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">Tedarikçi</th><th className="th">Kaynak kategori</th><th className="th">Shopify koleksiyonu</th><th className="th">Oto etiketler</th><th className="th" /></tr></thead>
              <tbody>
                {mappings.map(m => {
                  let tags: string[] = [];
                  try { tags = JSON.parse(m.autoTagsJson); } catch {}
                  return (
                    <tr key={m.id} className="border-t border-line">
                      <td className="td text-muted">{sName(m.supplierId)}</td>
                      <td className="td font-medium">{m.supplierCategory}</td>
                      <td className="td"><Badge tone="green">{m.shopifyCollection}</Badge></td>
                      <td className="td text-xs text-muted">{tags.join(", ") || "—"}</td>
                      <td className="td text-right"><button className="text-xs font-semibold text-danger hover:underline" onClick={() => del(m.id)}>Sil</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {categories.length > 0 ? (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Üründe görülen kategoriler</h2>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 40).map(c => {
                const mapped = mappings.some(m => m.supplierCategory === c.name);
                return (
                  <button key={c.name} onClick={() => setForm(f => ({ ...f, supplierCategory: c.name }))}
                    className={`badge ${mapped ? "bg-pine-100 text-pine-700" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {c.name} · {c.count}{mapped ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">Sarı olanlar henüz eşlenmemiş. Tıklayınca forma dolar.</p>
          </div>
        ) : null}
      </div>

      <div className="card h-fit space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Yeni eşleme</h2>
        <div>
          <label className="label">Tedarikçi (boş = hepsi)</label>
          <select className="input" value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
            <option value="">Tüm tedarikçiler</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><label className="label">Kaynak kategori</label><input className="input" placeholder="örn. Steam Games" value={form.supplierCategory} onChange={e => setForm(f => ({ ...f, supplierCategory: e.target.value }))} /></div>
        <div><label className="label">Shopify koleksiyonu</label><input className="input" placeholder="örn. PC Oyunları" value={form.shopifyCollection} onChange={e => setForm(f => ({ ...f, shopifyCollection: e.target.value }))} /></div>
        <div><label className="label">Otomatik etiketler (virgülle)</label><input className="input" placeholder="steam, pc" value={form.autoTags} onChange={e => setForm(f => ({ ...f, autoTags: e.target.value }))} /></div>
        <button className="btn-primary w-full" disabled={busy || !form.supplierCategory || !form.shopifyCollection} onClick={add}>
          {busy ? "Ekleniyor…" : "Eşleme ekle"}
        </button>
      </div>
    </div>
  );
}

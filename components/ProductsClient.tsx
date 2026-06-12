"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Empty } from "./ui";

type P = {
  id: string; title: string; sku: string | null; supplierId: string; supplierName: string;
  category: string | null; platform: string | null; region: string | null; language: string | null;
  deliveryType: string | null; cost: number; currency: string; price: number | null; compareAt: number | null;
  stock: number; shopifyStock: number | null; state: string; publishStatus: string;
  shopifyId: string | null; image: string | null; hasImage: boolean; hasDescription: boolean;
  priceChanged: boolean; stockChanged: boolean;
};

const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean))) as string[];

export default function ProductsClient({ products, suppliers }: { products: P[]; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [f, setF] = useState({ supplier: "", category: "", platform: "", region: "", language: "", delivery: "", imported: "", stock: "", flag: "", pmin: "", pmax: "" });

  // Ağır filtreler (supplier, category, platform, state) URL'e yazar → server tarafında DB'den filtreler
  function applyServerFilter(key: string, val: string) {
    const params = new URLSearchParams(window.location.search);
    if (val) params.set(key, val); else params.delete(key);
    router.push(`/products?${params.toString()}`);
  }
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useMemo(() => uniq(products.map(p => p.category)), [products]);
  const platforms = useMemo(() => uniq(products.map(p => p.platform)), [products]);
  const regions = useMemo(() => uniq(products.map(p => p.region)), [products]);
  const languages = useMemo(() => uniq(products.map(p => p.language)), [products]);
  const deliveries = useMemo(() => uniq(products.map(p => p.deliveryType)), [products]);

  const filtered = useMemo(() => products.filter(p => {
    if (q && !`${p.title} ${p.sku ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (f.supplier && p.supplierId !== f.supplier) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.platform && p.platform !== f.platform) return false;
    if (f.region && p.region !== f.region) return false;
    if (f.language && p.language !== f.language) return false;
    if (f.delivery && p.deliveryType !== f.delivery) return false;
    if (f.imported === "yes" && !p.shopifyId) return false;
    if (f.imported === "no" && p.shopifyId) return false;
    if (f.stock === "in" && p.stock <= 0) return false;
    if (f.stock === "out" && p.stock > 0) return false;
    if (f.flag === "price" && !p.priceChanged) return false;
    if (f.flag === "stock" && !p.stockChanged) return false;
    if (f.flag === "noimg" && p.hasImage) return false;
    if (f.flag === "nodesc" && p.hasDescription) return false;
    if (f.pmin && p.cost < Number(f.pmin)) return false;
    if (f.pmax && p.cost > Number(f.pmax)) return false;
    return true;
  }), [products, q, f]);

  const allSel = filtered.length > 0 && filtered.every(p => sel.has(p.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(filtered.map(p => p.id)));
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const ids = Array.from(sel);

  async function bulk(action: string, payload?: any, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(action); setMsg(null);
    const res = await fetch("/api/products/bulk", { method: "POST", body: JSON.stringify({ ids, action, payload }) });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? `${data.count} ürün güncellendi` : data.error);
    if (res.ok) { setSel(new Set()); router.refresh(); }
  }

  async function publish(status: "draft" | "active") {
    if (!confirm(`${ids.length} ürün Shopify'a "${status}" olarak gönderilecek. Devam?`)) return;
    setBusy("publish"); setMsg(null);
    const res = await fetch("/api/products/publish", { method: "POST", body: JSON.stringify({ ids, status }) });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? `Yayın: ${data.success} ✓ / ${data.failed} ✗ ${data.errors?.[0] ? "— " + data.errors[0] : ""}` : data.error);
    router.refresh();
  }

  async function sync(what: "stock" | "price" | "both", all = false) {
    setBusy("sync" + what); setMsg(null);
    const res = await fetch("/api/sync", { method: "POST", body: JSON.stringify(all ? { all: true, what } : { ids, what }) });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? `Senkron: ${data.success} ✓ / ${data.failed} ✗` : data.error);
    router.refresh();
  }

  const selStyle = "rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-pine-600";

  return (
    <div>
      {/* Filtre çubuğu */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs !py-1.5 text-sm" placeholder="Ürün veya SKU ara…" value={q} onChange={e => setQ(e.target.value)} />
          <select className={selStyle} value={f.supplier} onChange={e => { setF({ ...f, supplier: e.target.value }); applyServerFilter("supplier", e.target.value); }}>
            <option value="">Tedarikçi: tümü</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={selStyle} value={f.category} onChange={e => { setF({ ...f, category: e.target.value }); applyServerFilter("category", e.target.value); }}>
            <option value="">Kategori: tümü</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selStyle} value={f.platform} onChange={e => { setF({ ...f, platform: e.target.value }); applyServerFilter("platform", e.target.value); }}>
            <option value="">Platform: tümü</option>
            {platforms.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selStyle} value={f.region} onChange={e => setF({ ...f, region: e.target.value })}>
            <option value="">Bölge: tümü</option>
            {regions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selStyle} value={f.language} onChange={e => setF({ ...f, language: e.target.value })}>
            <option value="">Dil: tümü</option>
            {languages.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selStyle} value={f.delivery} onChange={e => setF({ ...f, delivery: e.target.value })}>
            <option value="">Teslimat: tümü</option>
            {deliveries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selStyle} value={f.imported} onChange={e => setF({ ...f, imported: e.target.value })}>
            <option value="">Shopify: tümü</option>
            <option value="yes">Aktarılmış</option>
            <option value="no">Aktarılmamış</option>
          </select>
          <select className={selStyle} value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })}>
            <option value="">Stok: tümü</option>
            <option value="in">Stokta</option>
            <option value="out">Stok yok</option>
          </select>
          <select className={selStyle} value={f.flag} onChange={e => setF({ ...f, flag: e.target.value })}>
            <option value="">Bayrak: tümü</option>
            <option value="price">Fiyatı değişen</option>
            <option value="stock">Stoğu değişen</option>
            <option value="noimg">Görseli eksik</option>
            <option value="nodesc">Açıklaması eksik</option>
          </select>
          <input className={selStyle + " w-24"} placeholder="Min maliyet" value={f.pmin} onChange={e => setF({ ...f, pmin: e.target.value })} />
          <input className={selStyle + " w-24"} placeholder="Max maliyet" value={f.pmax} onChange={e => setF({ ...f, pmax: e.target.value })} />
          <span className="ml-auto text-xs text-muted tabular-nums">{filtered.length} / {products.length} ürün</span>
        </div>
      </div>

      {/* Yapışkan toplu işlem çubuğu */}
      {sel.size > 0 && (
        <div className="sticky top-2 z-20 mb-4 card !bg-pine-950 !border-pine-900 p-3 text-white shadow-pop">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold mr-1">{sel.size} seçili</span>
            <button className="btn bg-pine-600 hover:bg-pine-500 text-white" disabled={!!busy} onClick={() => publish("draft")}>Taslak yayınla</button>
            <button className="btn bg-pine-600 hover:bg-pine-500 text-white" disabled={!!busy} onClick={() => publish("active")}>Aktif yayınla</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy} onClick={() => sync("stock")}>Stok senkronu</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy} onClick={() => sync("price")}>Fiyat senkronu</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy} onClick={() => sync("both")}>Stok + fiyat</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy}
              onClick={() => { const c = prompt("Yeni kategori:"); if (c) bulk("set_category", { category: c }); }}>Kategori değiştir</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy}
              onClick={() => { const c = prompt("Shopify koleksiyonları (virgülle):"); if (c) bulk("set_collections", { collections: c.split(",").map(s => s.trim()).filter(Boolean) }); }}>Koleksiyon ata</button>
            <button className="btn bg-white/10 hover:bg-white/20 text-white" disabled={!!busy}
              onClick={() => { const c = prompt("Etiketler (virgülle):"); if (c) bulk("set_tags", { tags: c.split(",").map(s => s.trim()).filter(Boolean) }); }}>Etiket güncelle</button>
            <button className="btn bg-red-500/20 hover:bg-red-500/30 text-red-200" disabled={!!busy}
              onClick={() => bulk("delete", {}, `${sel.size} ürün SADECE uygulamadan silinecek (Shopify etkilenmez). Emin misin?`)}>Uygulamadan sil</button>
            <button className="ml-auto text-xs underline opacity-70" onClick={() => setSel(new Set())}>Seçimi temizle</button>
          </div>
        </div>
      )}

      {msg && <p className="mb-3 text-sm font-medium text-pine-700">{msg}</p>}

      <div className="mb-3 flex gap-2">
        <button className="btn-ghost" disabled={!!busy} onClick={() => sync("stock", true)}>Tüm katalog: stok senkronu</button>
        <button className="btn-ghost" disabled={!!busy} onClick={() => sync("both", true)}>Tüm katalog: stok + fiyat</button>
      </div>

      {filtered.length === 0 ? (
        <Empty title="Ürün bulunamadı" hint="Filtreleri temizle veya Tedarikçiler sayfasından ürün çek." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-line bg-pine-50/50">
              <tr>
                <th className="th w-8"><input type="checkbox" checked={allSel} onChange={toggleAll} /></th>
                <th className="th">Ürün</th>
                <th className="th">Tedarikçi</th>
                <th className="th">Kategori</th>
                <th className="th text-right">Maliyet</th>
                <th className="th text-right">Satış</th>
                <th className="th text-right">Stok → Shopify</th>
                <th className="th">Durum</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.slice(0, 300).map(p => (
                <tr key={p.id} className="hover:bg-pine-50/40">
                  <td className="td"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      {p.image
                        ? <img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover border border-line" />
                        : <div className="h-9 w-9 rounded-md bg-amber50 border border-amber-200 grid place-items-center text-[10px] text-amber-700 font-bold">IMG?</div>}
                      <div>
                        <p className="font-semibold text-sm leading-tight line-clamp-1 max-w-[280px]">{p.title}</p>
                        <p className="text-[11px] text-muted">{p.sku} {p.platform ? `· ${p.platform}` : ""} {p.region ? `· ${p.region}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-xs">{p.supplierName}</td>
                  <td className="td text-xs">{p.category ?? "—"}</td>
                  <td className="td text-right tabular-nums text-xs">{p.cost.toFixed(2)} {p.currency}</td>
                  <td className="td text-right tabular-nums text-sm font-semibold">{p.price != null ? p.price.toFixed(2) : <span className="text-muted font-normal">—</span>}</td>
                  <td className="td text-right tabular-nums text-xs">
                    {p.stock} → <span className="font-bold">{p.shopifyStock ?? "—"}</span>
                    {p.stockChanged && <span className="ml-1 text-amber-600" title="Tedarikçi stoğu değişti">●</span>}
                    {p.priceChanged && <span className="ml-1 text-danger" title="Maliyet değişti">●</span>}
                  </td>
                  <td className="td">
                    <Badge tone={p.state === "published" ? "green" : p.state === "fetched" ? "amber" : "neutral"}>
                      {p.state === "published" ? (p.publishStatus === "active" ? "yayında" : "taslak") : p.state === "fetched" ? "incele" : p.state}
                    </Badge>
                  </td>
                  <td className="td"><Link href={`/products/${p.id}`} className="text-xs font-semibold text-pine-700 hover:underline">Düzenle →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && <p className="p-3 text-xs text-muted">İlk 300 satır gösteriliyor — filtreleri daralt.</p>}
        </div>
      )}
    </div>
  );
}

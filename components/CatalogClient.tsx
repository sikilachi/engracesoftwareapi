"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Supplier = { id: string; name: string; type: string };
type Product = {
  supplierProductId: string; title: string; supplierCategory?: string;
  platform?: string; region?: string; costPrice: number; currency: string;
  stock: number; images: string[]; description?: string; deliveryType?: string;
  meta?: Record<string, unknown>;
};

export default function CatalogClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingProds, setLoadingProds] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function selectSupplier(id: string) {
    setSupplierId(id); setCategories([]); setCategory(""); setProducts([]); setMsg(null);
    if (!id) return;
    setLoadingCats(true);
    const res = await fetch(`/api/suppliers/${id}/categories`);
    const data = await res.json();
    setLoadingCats(false);
    if (!res.ok) { setMsg(data.error); return; }
    setCategories(data.categories ?? []);
  }

  async function selectCategory(cat: string) {
    setCategory(cat); setProducts([]); setMsg(null); setSel(new Set());
    if (!cat || !supplierId) return;
    setLoadingProds(true);
    const res = await fetch(`/api/suppliers/${supplierId}/browse?category=${encodeURIComponent(cat)}`);
    const data = await res.json();
    setLoadingProds(false);
    if (!res.ok) { setMsg(data.error); return; }
    setProducts(data.products ?? []);
  }

  async function importSelected() {
    if (sel.size === 0) return;
    setImporting(true); setMsg(null);
    const toImport = products.filter(p => sel.has(p.supplierProductId));
    const res = await fetch(`/api/suppliers/${supplierId}/fetch`, {
      method: "POST",
      body: JSON.stringify({ products: toImport }),
    });
    const data = await res.json();
    setImporting(false);
    setMsg(res.ok ? `${data.success ?? sel.size} ürün içe aktarıldı` : data.error);
    if (res.ok) { setSel(new Set()); router.refresh(); }
  }

  const filtered = q ? products.filter(p => p.title.toLowerCase().includes(q.toLowerCase())) : products;
  const allSel = filtered.length > 0 && filtered.every(p => sel.has(p.supplierProductId));

  const selStyle = "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-pine-600 min-w-[200px]";

  return (
    <div className="space-y-4">
      {/* Filtre çubuğu */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className={selStyle} value={supplierId} onChange={e => selectSupplier(e.target.value)}>
            <option value="">Tedarikçi seç…</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
          </select>

          {loadingCats && <span className="text-sm text-muted animate-pulse">Kategoriler yükleniyor…</span>}

          {categories.length > 0 && (
            <select className={selStyle + " min-w-[280px]"} value={category} onChange={e => selectCategory(e.target.value)}>
              <option value="">Kategori seç…</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {products.length > 0 && (
            <input
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-pine-600"
              placeholder="Ürün ara…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          )}

          {loadingProds && <span className="text-sm text-muted animate-pulse">Ürünler yükleniyor…</span>}

          <span className="ml-auto text-xs text-muted tabular-nums">
            {products.length > 0 && `${filtered.length} / ${products.length} ürün`}
          </span>
        </div>
      </div>

      {msg && <p className="text-sm font-medium text-pine-700">{msg}</p>}

      {/* Seçili ürün toolbar */}
      {sel.size > 0 && (
        <div className="sticky top-2 z-20 card !bg-pine-950 !border-pine-900 p-3 text-white shadow-pop flex items-center gap-3">
          <span className="text-sm font-bold">{sel.size} seçili</span>
          <button
            className="btn bg-pine-600 hover:bg-pine-500 text-white"
            disabled={importing}
            onClick={importSelected}
          >
            {importing ? "İçe aktarılıyor…" : "Seçilenleri içe aktar"}
          </button>
          <button className="ml-auto text-xs underline opacity-70" onClick={() => setSel(new Set())}>Seçimi temizle</button>
        </div>
      )}

      {/* Ürün listesi */}
      {filtered.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-line bg-pine-50/50">
              <tr>
                <th className="th w-8">
                  <input type="checkbox" checked={allSel}
                    onChange={() => setSel(allSel ? new Set() : new Set(filtered.map(p => p.supplierProductId)))} />
                </th>
                <th className="th">Ürün</th>
                <th className="th">Kategori</th>
                <th className="th text-right">Maliyet</th>
                <th className="th text-right">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(p => (
                <tr key={p.supplierProductId} className="hover:bg-pine-50/40">
                  <td className="td">
                    <input type="checkbox" checked={sel.has(p.supplierProductId)}
                      onChange={() => setSel(s => { const n = new Set(s); n.has(p.supplierProductId) ? n.delete(p.supplierProductId) : n.add(p.supplierProductId); return n; })} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" className="h-9 w-9 rounded-md object-cover border border-line" />
                        : <div className="h-9 w-9 rounded-md bg-pine-50 border border-line" />}
                      <div>
                        <p className="font-semibold text-sm leading-tight line-clamp-1 max-w-[320px]">{p.title}</p>
                        <p className="text-[11px] text-muted">ID: {p.supplierProductId} {p.platform ? `· ${p.platform}` : ""} {p.region ? `· ${p.region}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-xs">{p.supplierCategory ?? "—"}</td>
                  <td className="td text-right tabular-nums text-sm font-semibold">
                    {p.costPrice.toFixed(2)} {p.currency}
                  </td>
                  <td className="td text-right tabular-nums text-xs">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadingProds && category && products.length === 0 && (
        <div className="card p-8 text-center text-sm text-muted">Bu kategoride ürün bulunamadı.</div>
      )}

      {!supplierId && (
        <div className="card p-8 text-center text-sm text-muted">Başlamak için bir tedarikçi seç.</div>
      )}
    </div>
  );
}

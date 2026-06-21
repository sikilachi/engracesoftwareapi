"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Empty } from "./ui";
import LiveProgress from "./LiveProgress";

type P = {
  id: string; title: string; sku: string | null; supplierId: string; supplierName: string;
  category: string | null; platform: string | null; region: string | null; language: string | null;
  deliveryType: string | null; cost: number; currency: string; price: number | null; compareAt: number | null;
  stock: number; shopifyStock: number | null; state: string; publishStatus: string;
  shopifyId: string | null; image: string | null; hasImage: boolean; hasDescription: boolean;
  requiresShipping: boolean; trackInventory: boolean; priceChanged: boolean; stockChanged: boolean;
};

type Publication = { id: string; name: string; autoPublish?: boolean };
type PublishOptions = {
  skuStart: string;
  vendor: string;
  templateSuffix: string;
  requiresShipping: boolean;
  trackInventory: boolean;
  saveOptions: boolean;
  publicationIds: string[];
};

const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter(Boolean))) as string[];
const defaultPublishOptions: PublishOptions = {
  skuStart: "MM1001",
  vendor: "",
  templateSuffix: "srd-digital",
  requiresShipping: false,
  trackInventory: true,
  saveOptions: true,
  publicationIds: [],
};

export default function ProductsClient({ products, suppliers, allCategories = [], allPlatforms = [] }: {
  products: P[];
  suppliers: { id: string; name: string }[];
  allCategories?: string[];
  allPlatforms?: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [f, setF] = useState({ supplier: "", category: "", platform: "", region: "", language: "", delivery: "", imported: "", stock: "", flag: "", pmin: "", pmax: "" });

  function applyServerFilter(key: string, val: string) {
    const params = new URLSearchParams(window.location.search);
    if (val) params.set(key, val); else params.delete(key);
    router.push(`/products?${params.toString()}`);
  }

  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<null | { types: string[]; startedAt: string; label: string }>(null);
  const [publishPanel, setPublishPanel] = useState<null | { status: "draft" | "active" }>(null);
  const [publishOptions, setPublishOptions] = useState(defaultPublishOptions);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  const localCategories = useMemo(() => uniq(products.map(p => p.category)), [products]);
  const localPlatforms = useMemo(() => uniq(products.map(p => p.platform)), [products]);
  const regions = useMemo(() => uniq(products.map(p => p.region)), [products]);
  const languages = useMemo(() => uniq(products.map(p => p.language)), [products]);
  const deliveries = useMemo(() => uniq(products.map(p => p.deliveryType)), [products]);
  const categories = allCategories.length ? allCategories : localCategories;
  const platforms = allPlatforms.length ? allPlatforms : localPlatforms;

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
  const selectedProducts = filtered.filter(p => sel.has(p.id));

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
    if (!confirm(publishPreview(status))) return;
    setBusy("publish"); setMsg(null);
    setProgress({ types: ["publish"], startedAt: new Date().toISOString(), label: "Shopify yayını" });
    const res = await fetch("/api/products/publish", { method: "POST", body: JSON.stringify({ ids, status }) });
    const data = await res.json();
    setBusy(null);
    setTimeout(() => setProgress(null), 1200);
    setMsg(res.ok ? `Yayın: ${data.success} ✓ / ${data.failed} ✗ ${data.errors?.[0] ? "— " + data.errors[0] : ""}` : data.error);
    router.refresh();
  }

  function productTemplate(p: P) {
    return /smm/i.test(p.deliveryType ?? "") ? "Shopify varsayilan template" : "srd-digital";
  }

  function publishPreview(status: "draft" | "active") {
    const lines = selectedProducts.slice(0, 10).map((p, i) => [
      `${i + 1}. ${p.title}`,
      `   Template: ${productTemplate(p)}`,
      `   Satici: ${p.supplierName}`,
      `   SKU: ${p.sku ?? "-"}`,
      `   Tip: ${p.requiresShipping ? "Fiziksel urun" : "Dijital urun / servis"}`,
      `   Envanter: ${p.trackInventory ? "Takip edilecek" : "Takip edilmeyecek"}`,
    ].join("\n"));
    return [
      `${ids.length} urun Shopify'a ${status === "active" ? "AKTIF" : "TASLAK"} olarak gonderilecek.`,
      "",
      ...lines,
      ...(ids.length > 10 ? [`... ve ${ids.length - 10} urun daha`] : []),
      "",
      "Devam edilsin mi?",
    ].join("\n");
  }

  function openPublish(status: "draft" | "active") {
    const first = selectedProducts[0];
    setPublishOptions(o => ({ ...o, vendor: o.vendor || first?.supplierName || "" }));
    setPublishPanel({ status });
    loadPublications();
  }

  async function loadPublications() {
    if (publications.length || pubLoading) return;
    setPubLoading(true); setPubError(null);
    const res = await fetch("/api/shopify/publications");
    const data = await res.json().catch(() => ({}));
    setPubLoading(false);
    if (!res.ok) {
      setPubError(data.error ?? "Satis kanallari alinamadi");
      return;
    }
    const pubs = data.publications ?? [];
    setPublications(pubs);
    setPublishOptions(o => ({
      ...o,
      publicationIds: o.publicationIds.length ? o.publicationIds : pubs.map((p: Publication) => p.id),
    }));
  }

  async function publishFromPanel() {
    if (!publishPanel) return;
    setBusy("publish"); setMsg(null);
    setProgress({ types: ["publish"], startedAt: new Date().toISOString(), label: "Shopify yayını" });
    const res = await fetch("/api/products/publish", {
      method: "POST",
      body: JSON.stringify({ ids, status: publishPanel.status, options: publishOptions }),
    });
    const data = await res.json();
    setBusy(null);
    setTimeout(() => setProgress(null), 1200);
    setPublishPanel(null);
    setMsg(res.ok ? `YayÄ±n: ${data.success} âœ“ / ${data.failed} âœ— ${data.errors?.[0] ? "â€” " + data.errors[0] : ""}` : data.error);
    router.refresh();
  }

  function skuAt(index: number) {
    const raw = publishOptions.skuStart.trim();
    if (!raw) return selectedProducts[index]?.sku ?? "-";
    const match = raw.match(/^(.*?)(\d+)$/);
    if (!match) return index === 0 ? raw : `${raw}-${index + 1}`;
    const [, prefix, digits] = match;
    return `${prefix}${String(Number(digits) + index).padStart(digits.length, "0")}`;
  }

  async function sync(what: "stock" | "price" | "both", all = false) {
    setBusy("sync" + what); setMsg(null);
    setProgress({
      types: [what === "both" ? "full" : what],
      startedAt: new Date().toISOString(),
      label: what === "stock" ? "Stok senkronu" : what === "price" ? "Fiyat senkronu" : "Stok + fiyat senkronu",
    });
    const res = await fetch("/api/sync", { method: "POST", body: JSON.stringify(all ? { all: true, what } : { ids, what }) });
    const data = await res.json();
    setBusy(null);
    setTimeout(() => setProgress(null), 1200);
    setMsg(res.ok ? `Senkron: ${data.success} ✓ / ${data.failed} ✗` : data.error);
    router.refresh();
  }

  const selStyle = "rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-pine-600";

  return (
    <div>
      <LiveProgress active={!!progress} types={progress?.types ?? []} startedAt={progress?.startedAt ?? null} fallbackLabel={progress?.label} />
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
            <button className="btn bg-pine-600 hover:bg-pine-500 text-white" disabled={!!busy} onClick={() => openPublish("draft")}>Taslak yayınla</button>
            <button className="btn bg-pine-600 hover:bg-pine-500 text-white" disabled={!!busy} onClick={() => openPublish("active")}>Aktif yayınla</button>
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

      {publishPanel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-white shadow-pop">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-bold">Shopify yayin ayarlari</h2>
              <p className="text-xs text-muted">{ids.length} urun {publishPanel.status === "active" ? "aktif" : "taslak"} olarak gonderilecek.</p>
            </div>
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 lg:grid-cols-[280px_1fr]">
              <div className="space-y-3">
                <div>
                  <label className="label">Baslangic SKU</label>
                  <input className="input" value={publishOptions.skuStart} onChange={e => setPublishOptions(o => ({ ...o, skuStart: e.target.value }))} placeholder="MM1001" />
                </div>
                <div>
                  <label className="label">Satici / Vendor</label>
                  <input className="input" value={publishOptions.vendor} onChange={e => setPublishOptions(o => ({ ...o, vendor: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Template</label>
                  <select className="input" value={publishOptions.templateSuffix} onChange={e => setPublishOptions(o => ({ ...o, templateSuffix: e.target.value }))}>
                    <option value="srd-digital">srd-digital</option>
                    <option value="">Shopify varsayilan template</option>
                  </select>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                  <span>Fiziksel urun / kargo gerekir</span>
                  <input type="checkbox" checked={publishOptions.requiresShipping} onChange={e => setPublishOptions(o => ({ ...o, requiresShipping: e.target.checked }))} className="h-4 w-4 accent-pine-600" />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                  <span>Shopify envanter takip etsin</span>
                  <input type="checkbox" checked={publishOptions.trackInventory} onChange={e => setPublishOptions(o => ({ ...o, trackInventory: e.target.checked }))} className="h-4 w-4 accent-pine-600" />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                  <span>Bu ayarlari urunlere kaydet</span>
                  <input type="checkbox" checked={publishOptions.saveOptions} onChange={e => setPublishOptions(o => ({ ...o, saveOptions: e.target.checked }))} className="h-4 w-4 accent-pine-600" />
                </label>
                <div className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Satis kanallari</p>
                    {publications.length > 0 && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-pine-700 hover:underline"
                        onClick={() => setPublishOptions(o => ({
                          ...o,
                          publicationIds: o.publicationIds.length === publications.length ? [] : publications.map(p => p.id),
                        }))}
                      >
                        {publishOptions.publicationIds.length === publications.length ? "Tumunu kapat" : "Tumunu sec"}
                      </button>
                    )}
                  </div>
                  {pubLoading && <p className="text-xs text-muted">Kanallar yukleniyor...</p>}
                  {pubError && <p className="text-xs text-danger">{pubError}</p>}
                  {!pubLoading && !pubError && publications.length === 0 && <p className="text-xs text-muted">Satis kanali bulunamadi.</p>}
                  <div className="space-y-2">
                    {publications.map(pub => (
                      <label key={pub.id} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-2.5 py-2 text-sm">
                        <span>{pub.name}</span>
                        <input
                          type="checkbox"
                          checked={publishOptions.publicationIds.includes(pub.id)}
                          onChange={e => setPublishOptions(o => ({
                            ...o,
                            publicationIds: e.target.checked
                              ? Array.from(new Set([...o.publicationIds, pub.id]))
                              : o.publicationIds.filter(id => id !== pub.id),
                          }))}
                          className="h-4 w-4 accent-pine-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-pine-50/60">
                    <tr><th className="th">Urun</th><th className="th">SKU</th><th className="th">Tip</th><th className="th">Envanter</th><th className="th">Kanal</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedProducts.slice(0, 20).map((p, i) => (
                      <tr key={p.id}>
                        <td className="td">
                          <p className="font-semibold line-clamp-1">{p.title}</p>
                          <p className="text-[11px] text-muted">{publishOptions.vendor || p.supplierName} · {publishOptions.templateSuffix || "default"}</p>
                        </td>
                        <td className="td font-mono text-xs">{skuAt(i)}</td>
                        <td className="td text-xs">{publishOptions.requiresShipping ? "Fiziksel" : "Dijital"}</td>
                        <td className="td text-xs">{publishOptions.trackInventory ? "Takip" : "Takip yok"}</td>
                        <td className="td text-xs">{publishOptions.publicationIds.length || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedProducts.length > 20 && <p className="border-t border-line p-3 text-xs text-muted">Ilk 20 urun gosteriliyor, toplam {selectedProducts.length} urun uygulanacak.</p>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
              <button className="btn-ghost" disabled={busy === "publish"} onClick={() => setPublishPanel(null)}>Iptal</button>
              <button className="btn-primary" disabled={busy === "publish"} onClick={publishFromPanel}>
                {busy === "publish" ? "Yayinlaniyor..." : "Uygula ve yayinla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty title={products.length === 0 ? "Filtre seçin" : "Ürün bulunamadı"} hint={products.length === 0 ? "Yukarıdan tedarikçi veya kategori seç — ürünler anında yüklenir." : "Filtreleri temizle veya Tedarikçiler sayfasından ürün çek."} />
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

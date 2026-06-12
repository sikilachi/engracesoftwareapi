"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "./ui";

type Review = { id: string; author: string; rating: number; title: string | null; body: string; createdAt: string };

type P = {
  id: string; title: string; description: string; shortDescription: string;
  usageInstructions: string; activationInstructions: string;
  platform: string; region: string; language: string; edition: string;
  licenseType: string; deliveryType: string; activationType: string;
  supplierCategory: string; sku: string; seoTitle: string; seoDescription: string;
  publishStatus: string; state: string;
  imagesJson: string; tagsJson: string; collectionsJson: string; stockRuleJson: string; metaJson: string;
  currency: string; costPrice: number; sellingPrice: number | null; priceOverride: number | null;
  compareAtPrice: number | null; supplierStock: number; shopifyStock: number | null;
  syncPrice: boolean; syncStock: boolean; syncTitle: boolean; syncDescription: boolean;
  syncImages: boolean; protectEdits: boolean; manuallyEdited: boolean;
  shopifyProductId: string | null; supplierName: string; supplierProductId: string;
  lastSyncedAt: string | null;
};

function jparse<T>(s: string, fb: T): T { try { return JSON.parse(s) as T; } catch { return fb; } }

export default function ProductEditor({ product, suppliers }: { product: P; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    ...product,
    images: jparse<string[]>(product.imagesJson, []).join("\n"),
    tags: jparse<string[]>(product.tagsJson, []).join(", "),
    collections: jparse<string[]>(product.collectionsJson, []).join(", "),
    priceOverrideStr: product.priceOverride != null ? String(product.priceOverride) : "",
    stockRule: product.stockRuleJson || "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState("5");
  const set = (k: string, v: unknown) => setF((x: any) => ({ ...x, [k]: v }));

  useEffect(() => {
    fetch(`/api/products/${product.id}/reviews`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews ?? []));
  }, [product.id]);

  const margin = (f.sellingPrice ?? 0) - f.costPrice;
  const marginPct = f.costPrice > 0 ? (margin / f.costPrice) * 100 : 0;

  async function save() {
    setBusy("save"); setMsg(null);
    const body: Record<string, unknown> = {
      title: f.title, description: f.description, shortDescription: f.shortDescription,
      usageInstructions: f.usageInstructions, activationInstructions: f.activationInstructions,
      platform: f.platform, region: f.region, language: f.language, edition: f.edition,
      licenseType: f.licenseType, deliveryType: f.deliveryType, activationType: f.activationType,
      supplierCategory: f.supplierCategory, sku: f.sku, seoTitle: f.seoTitle, seoDescription: f.seoDescription,
      publishStatus: f.publishStatus,
      imagesJson: JSON.stringify(f.images.split("\n").map(s => s.trim()).filter(Boolean)),
      tagsJson: JSON.stringify(f.tags.split(",").map(s => s.trim()).filter(Boolean)),
      collectionsJson: JSON.stringify(f.collections.split(",").map(s => s.trim()).filter(Boolean)),
      priceOverride: f.priceOverrideStr === "" ? null : Number(f.priceOverrideStr),
      syncPrice: f.syncPrice, syncStock: f.syncStock, syncTitle: f.syncTitle,
      syncDescription: f.syncDescription, syncImages: f.syncImages, protectEdits: f.protectEdits,
    };
    if (f.stockRule.trim()) {
      try { JSON.parse(f.stockRule); body.stockRuleJson = f.stockRule; }
      catch { setBusy(null); return setMsg("Stok kuralı geçerli JSON değil"); }
    } else body.stockRuleJson = null;
    const res = await fetch(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(null);
    setMsg(res.ok ? "Kaydedildi" : "Hata: kaydedilemedi");
    router.refresh();
  }

  async function publish(status: "draft" | "active") {
    setBusy("publish"); setMsg(null);
    const res = await fetch("/api/products/publish", { method: "POST", body: JSON.stringify({ ids: [product.id], status }) });
    const d = await res.json();
    setBusy(null);
    setMsg(res.ok
      ? (d.success > 0 ? `Shopify'a gönderildi ✓` : `Yayın başarısız — ${d.errors?.[0] ?? "bilinmeyen hata"}`)
      : d.error ?? "Yayın hatası");
    router.refresh();
  }

  async function generateReviews() {
    setBusy("reviews"); setMsg(null);
    const res = await fetch(`/api/products/${product.id}/reviews/generate`, {
      method: "POST", body: JSON.stringify({ count: Number(reviewCount) || 5 }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) { setMsg(d.error ?? "Yorum üretilemedi"); return; }
    setReviews(r => [...d.reviews, ...r]);
    setMsg(`${d.count} yorum üretildi`);
  }

  async function deleteReviews() {
    setBusy("delreviews"); setMsg(null);
    await fetch(`/api/products/${product.id}/reviews`, { method: "DELETE" });
    setReviews([]); setBusy(null); setMsg("Yorumlar silindi");
  }

  async function sync(what: "stock" | "price" | "both") {
    setBusy("sync" + what); setMsg(null);
    const res = await fetch("/api/sync", { method: "POST", body: JSON.stringify({ ids: [product.id], what }) });
    const d = await res.json();
    setBusy(null);
    setMsg(res.ok ? `Senkron tamam (${d.success ?? 1} başarılı, ${d.failed ?? 0} hatalı)` : d.error ?? "Senkron hatası");
    router.refresh();
  }

  const images = f.images.split("\n").map(s => s.trim()).filter(Boolean);
  const meta = jparse<Record<string, unknown>>(product.metaJson, {});
  const Toggle = ({ k, label }: { k: keyof typeof f; label: string }) => (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={Boolean(f[k])} onChange={e => set(k as string, e.target.checked)} className="h-4 w-4 accent-pine-600" />
    </label>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/products" className="text-xs font-semibold text-pine-700 hover:underline">← Ürünler</Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{product.title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {product.supplierName} · ID {product.supplierProductId}
            {product.shopifyProductId ? " · Shopify'da yayında" : " · Henüz Shopify'da değil"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={busy !== null} onClick={() => sync("stock")}>Stok güncelle</button>
          <button className="btn-ghost" disabled={busy !== null} onClick={() => sync("price")}>Fiyat güncelle</button>
          <button className="btn-ghost" disabled={busy !== null} onClick={() => sync("both")}>Stok + Fiyat</button>
          <button className="btn-ghost" disabled={busy !== null} onClick={() => publish("draft")}>Taslak yayınla</button>
          <button className="btn-primary" disabled={busy !== null} onClick={() => publish("active")}>Aktif yayınla</button>
        </div>
      </div>

      {msg ? <div className="mb-4 rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">İçerik</h2>
            <div><label className="label">Başlık</label><input className="input" value={f.title} onChange={e => set("title", e.target.value)} /></div>
            <div><label className="label">Açıklama (HTML)</label><textarea className="input min-h-[140px]" value={f.description} onChange={e => set("description", e.target.value)} /></div>
            <div><label className="label">Kısa açıklama</label><textarea className="input min-h-[60px]" value={f.shortDescription} onChange={e => set("shortDescription", e.target.value)} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label">Kullanım talimatı</label><textarea className="input min-h-[90px]" value={f.usageInstructions} onChange={e => set("usageInstructions", e.target.value)} /></div>
              <div><label className="label">Aktivasyon talimatı</label><textarea className="input min-h-[90px]" value={f.activationInstructions} onChange={e => set("activationInstructions", e.target.value)} /></div>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Görseller</h2>
            <p className="text-xs text-muted">Her satıra bir görsel URL'i. İlk görsel ana görsel olur.</p>
            <textarea className="input min-h-[90px] font-mono text-xs" value={f.images} onChange={e => set("images", e.target.value)} />
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {images.slice(0, 8).map(u => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
                ))}
              </div>
            ) : <Badge tone="amber">Görsel yok</Badge>}
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Özellikler</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {([
                ["platform", "Platform"], ["region", "Bölge"], ["language", "Dil"],
                ["edition", "Sürüm"], ["licenseType", "Lisans tipi"], ["deliveryType", "Teslimat tipi"],
                ["activationType", "Aktivasyon tipi"], ["supplierCategory", "Tedarikçi kategorisi"], ["sku", "SKU"],
              ] as const).map(([k, label]) => (
                <div key={k}><label className="label">{label}</label><input className="input" value={(f as any)[k]} onChange={e => set(k, e.target.value)} /></div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label">Etiketler (virgülle)</label><input className="input" value={f.tags} onChange={e => set("tags", e.target.value)} /></div>
              <div><label className="label">Shopify koleksiyonları (virgülle)</label><input className="input" value={f.collections} onChange={e => set("collections", e.target.value)} /></div>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">SEO</h2>
            <div><label className="label">SEO başlık</label><input className="input" value={f.seoTitle} onChange={e => set("seoTitle", e.target.value)} /></div>
            <div><label className="label">SEO açıklama</label><textarea className="input min-h-[60px]" value={f.seoDescription} onChange={e => set("seoDescription", e.target.value)} /></div>
          </div>

          {Object.keys(meta).length > 0 ? (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Tedarikçi meta verisi (salt okunur)</h2>
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">{JSON.stringify(meta, null, 2)}</pre>
            </div>
          ) : null}

          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Test Yorumları (AI)</h2>
              {reviews.length > 0 && (
                <button className="text-xs text-danger underline" disabled={busy !== null} onClick={deleteReviews}>
                  Tümünü sil
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={20}
                className="input w-20 text-center"
                value={reviewCount}
                onChange={e => setReviewCount(e.target.value)}
              />
              <span className="text-sm text-muted">yorum</span>
              <button className="btn-primary" disabled={busy !== null} onClick={generateReviews}>
                {busy === "reviews" ? "Üretiliyor…" : "AI ile üret"}
              </button>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{r.author}</span>
                        <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      </div>
                      <span className="text-[11px] text-muted">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                    {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
                    <p className="mt-1 text-sm text-muted leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Henüz yorum yok. Yukarıdan üret.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Fiyat & Stok</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted">Maliyet</p><p className="font-semibold tabular-nums">{f.costPrice.toFixed(2)} {f.currency}</p></div>
              <div><p className="text-xs text-muted">Satış fiyatı</p><p className="font-semibold tabular-nums">{f.sellingPrice != null ? f.sellingPrice.toFixed(2) : "—"}</p></div>
              <div><p className="text-xs text-muted">Kâr</p><p className={`font-semibold tabular-nums ${margin >= 0 ? "text-pine-700" : "text-danger"}`}>{margin.toFixed(2)}</p></div>
              <div><p className="text-xs text-muted">Marj</p><p className="font-semibold tabular-nums">{marginPct.toFixed(0)}%</p></div>
              <div><p className="text-xs text-muted">Tedarikçi stok</p><p className="font-semibold tabular-nums">{f.supplierStock}</p></div>
              <div><p className="text-xs text-muted">Shopify stok</p><p className="font-semibold tabular-nums">{f.shopifyStock ?? "—"}</p></div>
            </div>
            <div>
              <label className="label">Fiyat override (boş = kural uygulanır)</label>
              <input className="input" placeholder="örn. 19.99" value={f.priceOverrideStr} onChange={e => set("priceOverrideStr", e.target.value)} />
            </div>
            <div>
              <label className="label">Ürüne özel stok kuralı (JSON, boş = genel ayar)</label>
              <textarea className="input min-h-[60px] font-mono text-xs" placeholder='{"mode":"fixed","cap":3,"divisor":4,"min":0}' value={f.stockRule} onChange={e => set("stockRule", e.target.value)} />
            </div>
            <div>
              <label className="label">Yayın durumu</label>
              <select className="input" value={f.publishStatus} onChange={e => set("publishStatus", e.target.value)}>
                <option value="draft">Taslak</option>
                <option value="active">Aktif</option>
              </select>
            </div>
          </div>

          <div className="card space-y-2 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Senkron davranışı</h2>
            <Toggle k="syncPrice" label="Fiyatı otomatik senkronla" />
            <Toggle k="syncStock" label="Stoğu otomatik senkronla" />
            <Toggle k="syncTitle" label="Başlığı otomatik senkronla" />
            <Toggle k="syncDescription" label="Açıklamayı otomatik senkronla" />
            <Toggle k="syncImages" label="Görselleri otomatik senkronla" />
            <Toggle k="protectEdits" label="Manuel düzenlemelerimi koru" />
            {product.manuallyEdited ? <p className="text-xs text-amber-700">Bu ürün manuel düzenlendi.</p> : null}
            {product.lastSyncedAt ? <p className="text-xs text-muted">Son senkron: {new Date(product.lastSyncedAt).toLocaleString("tr-TR")}</p> : null}
          </div>

          <button className="btn-primary w-full" disabled={busy !== null} onClick={save}>
            {busy === "save" ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

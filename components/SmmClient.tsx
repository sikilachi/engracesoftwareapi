"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type V = {
  id: string; label: string; quantity: number; country: string | null; refill: string | null;
  speed: string | null; providerServiceId: string; costPrice: number; price: number; active: boolean;
};
type G = {
  id: string; title: string; platform: string; status: string; logoUrl: string | null;
  shopifyProductId: string | null; requiredFieldsJson: string; descriptionHtml: string; variants: V[];
};

const EMPTY_VARIANT = { quantity: "", country: "", refill: "", speed: "", providerServiceId: "", supplierId: "", costPrice: "", price: "" };

export default function SmmClient({ groups, suppliers }: { groups: G[]; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", platform: "instagram", descriptionHtml: "", requiredFields: "Hedef Link" });
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null);
  const [vForm, setVForm] = useState<Record<string, typeof EMPTY_VARIANT>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const vf = (gid: string) => vForm[gid] ?? EMPTY_VARIANT;
  const setVf = (gid: string, k: string, v: string) => setVForm(x => ({ ...x, [gid]: { ...vf(gid), [k]: v } }));

  async function addGroup() {
    setBusy("add"); setMsg(null);
    const res = await fetch("/api/smm/groups", {
      method: "POST",
      body: JSON.stringify({
        title: form.title.trim(),
        platform: form.platform.trim().toLowerCase(),
        descriptionHtml: form.descriptionHtml,
        requiredFields: form.requiredFields.split(",").map(s => s.trim()).filter(Boolean),
      }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) return setMsg(d.error ?? "Hata");
    setForm({ title: "", platform: "instagram", descriptionHtml: "", requiredFields: "Hedef Link" });
    setMsg("Grup oluşturuldu");
    if (d.id) setOpen(d.id);
    router.refresh();
  }

  async function addVariant(gid: string) {
    const f = vf(gid);
    if (!f.quantity || !f.providerServiceId || !f.price) return setMsg("Miktar, servis ID ve fiyat zorunlu");
    setBusy("v" + gid); setMsg(null);
    const res = await fetch(`/api/smm/groups/${gid}`, {
      method: "PUT",
      body: JSON.stringify({
        quantity: Number(f.quantity), country: f.country || null, refill: f.refill || null, speed: f.speed || null,
        providerServiceId: f.providerServiceId, supplierId: f.supplierId || null,
        costPrice: Number(f.costPrice || 0), price: Number(f.price),
      }),
    });
    setBusy(null);
    if (!res.ok) { const d = await res.json(); return setMsg(d.error ?? "Hata"); }
    setVForm(x => ({ ...x, [gid]: EMPTY_VARIANT }));
    router.refresh();
  }

  async function delVariant(gid: string, vid: string) {
    await fetch(`/api/smm/groups/${gid}`, { method: "PUT", body: JSON.stringify({ deleteVariantId: vid }) });
    router.refresh();
  }

  async function delGroup(gid: string) {
    if (!confirm("Grup ve tüm varyantları uygulamadan silinecek (Shopify etkilenmez). Emin misin?")) return;
    await fetch(`/api/smm/groups/${gid}`, { method: "DELETE" });
    router.refresh();
  }

  async function publish(gid: string) {
    setBusy("pub" + gid); setMsg(null);
    const res = await fetch(`/api/smm/groups/${gid}`, { method: "POST" });
    const d = await res.json();
    setBusy(null);
    setMsg(res.ok ? "Shopify'a taslak olarak yayınlandı 🎉" : d.error ?? "Yayın hatası");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
        {groups.length === 0 ? (
          <Empty title="Henüz SMM grubu yok" hint='Örn. "Instagram Takipçi" grubu oluştur, sonra 1000/5000/10000 paketlerini varyant olarak ekle.' />
        ) : groups.map(g => {
          let req: string[] = [];
          try { req = JSON.parse(g.requiredFieldsJson); } catch {}
          const isOpen = open === g.id;
          const f = vf(g.id);
          return (
            <div key={g.id} className="card">
              <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : g.id)}>
                <div className="flex items-center gap-3">
                  {g.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.logoUrl} alt="" className="h-9 w-9 rounded-lg border border-line object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">!</div>
                  )}
                  <div>
                    <p className="font-semibold">{g.title}</p>
                    <p className="text-xs text-muted">{g.platform} · {g.variants.length} varyant · müşteriden istenen: {req.join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={g.status === "published" ? "green" : "neutral"}>{g.status === "published" ? "Yayında" : "Taslak"}</Badge>
                  <span className="text-muted">{isOpen ? "▴" : "▾"}</span>
                </div>
              </button>

              {isOpen ? (
                <div className="border-t border-line p-4">
                  {!g.logoUrl ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Logo eksik — Logo Yöneticisi'nden "{g.platform}" logosu yükle, otomatik atanır.</p> : null}
                  {g.variants.length > 0 ? (
                    <div className="mb-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr><th className="th">Paket</th><th className="th">Servis ID</th><th className="th">Maliyet</th><th className="th">Fiyat</th><th className="th">Kâr</th><th className="th" /></tr></thead>
                        <tbody>
                          {g.variants.map(v => (
                            <tr key={v.id} className="border-t border-line">
                              <td className="td font-medium">{v.label}</td>
                              <td className="td font-mono text-xs">{v.providerServiceId}</td>
                              <td className="td tabular-nums">{v.costPrice.toFixed(2)}</td>
                              <td className="td tabular-nums">{v.price.toFixed(2)}</td>
                              <td className={`td tabular-nums ${v.price - v.costPrice >= 0 ? "text-pine-700" : "text-danger"}`}>{(v.price - v.costPrice).toFixed(2)}</td>
                              <td className="td text-right"><button className="text-xs font-semibold text-danger hover:underline" onClick={() => delVariant(g.id, v.id)}>Sil</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="mb-4 text-sm text-muted">Henüz varyant yok.</p>}

                  <div className="mb-4 grid gap-2 md:grid-cols-4">
                    <input className="input" placeholder="Miktar (örn. 1000)" type="number" value={f.quantity} onChange={e => setVf(g.id, "quantity", e.target.value)} />
                    <input className="input" placeholder="Ülke/Tip (ops.)" value={f.country} onChange={e => setVf(g.id, "country", e.target.value)} />
                    <input className="input" placeholder="Refill gün (ops.)" value={f.refill} onChange={e => setVf(g.id, "refill", e.target.value)} />
                    <input className="input" placeholder="Hız (ops.)" value={f.speed} onChange={e => setVf(g.id, "speed", e.target.value)} />
                    <input className="input" placeholder="Sağlayıcı servis ID *" value={f.providerServiceId} onChange={e => setVf(g.id, "providerServiceId", e.target.value)} />
                    <select className="input" value={f.supplierId} onChange={e => setVf(g.id, "supplierId", e.target.value)}>
                      <option value="">SMM tedarikçisi (ops.)</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input className="input" placeholder="Maliyet" type="number" step="0.01" value={f.costPrice} onChange={e => setVf(g.id, "costPrice", e.target.value)} />
                    <input className="input" placeholder="Satış fiyatı *" type="number" step="0.01" value={f.price} onChange={e => setVf(g.id, "price", e.target.value)} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="btn-ghost" disabled={busy !== null} onClick={() => addVariant(g.id)}>{busy === "v" + g.id ? "Ekleniyor…" : "+ Varyant ekle"}</button>
                    <button className="btn-primary" disabled={busy !== null || g.variants.length === 0} onClick={() => publish(g.id)}>
                      {busy === "pub" + g.id ? "Yayınlanıyor…" : g.shopifyProductId ? "Shopify'da güncelle" : "Shopify'a yayınla"}
                    </button>
                    <button className="btn-danger ml-auto" disabled={busy !== null} onClick={() => delGroup(g.id)}>Grubu sil</button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="card h-fit space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Yeni SMM grubu</h2>
        <div><label className="label">Başlık</label><input className="input" placeholder="örn. Instagram Takipçi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div>
          <label className="label">Platform</label>
          <input className="input" list="platforms" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} />
          <datalist id="platforms">
            {["instagram", "tiktok", "youtube", "twitter", "facebook", "telegram", "spotify", "twitch", "discord", "linkedin"].map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div><label className="label">Açıklama (HTML, ops.)</label><textarea className="input min-h-[80px]" value={form.descriptionHtml} onChange={e => setForm(f => ({ ...f, descriptionHtml: e.target.value }))} /></div>
        <div>
          <label className="label">Müşteriden istenecek alanlar (virgülle)</label>
          <input className="input" value={form.requiredFields} onChange={e => setForm(f => ({ ...f, requiredFields: e.target.value }))} />
          <p className="mt-1 text-xs text-muted">Shopify'da line item property adı olarak kullanılır (örn. "Hedef Link").</p>
        </div>
        <button className="btn-primary w-full" disabled={busy !== null || !form.title.trim()} onClick={addGroup}>{busy === "add" ? "Oluşturuluyor…" : "Grup oluştur"}</button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type O = {
  id: string; shopifyOrderName: string; productTitle: string; variantLabel: string | null;
  targetLink: string | null; quantity: number; refill: string | null; providerServiceId: string | null;
  status: string; notes: string; optionsJson: string; customerJson: string; createdAt: string;
};

const STATUSES = [
  ["pending", "Bekliyor", "amber"],
  ["processing", "İşleniyor", "blue"],
  ["completed", "Tamamlandı", "green"],
  ["failed", "Başarısız", "red"],
  ["refunded", "İade", "neutral"],
] as const;

export default function SmmOrdersClient({ orders }: { orders: O[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const list = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const tone = (s: string) => (STATUSES.find(x => x[0] === s)?.[2] ?? "neutral") as any;
  const label = (s: string) => STATUSES.find(x => x[0] === s)?.[1] ?? s;

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/smm/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setBusy(null);
    router.refresh();
  }

  async function saveNotes(id: string, notes: string) {
    await fetch(`/api/smm/orders/${id}`, { method: "PATCH", body: JSON.stringify({ notes }) });
    router.refresh();
  }

  function copy(o: O) {
    const text = [
      `Servis ID: ${o.providerServiceId ?? "?"}`,
      `Link: ${o.targetLink ?? "?"}`,
      `Miktar: ${o.quantity}`,
      o.refill ? `Refill: ${o.refill}` : null,
      `Sipariş: ${o.shopifyOrderName} · ${o.productTitle}${o.variantLabel ? " / " + o.variantLabel : ""}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(o.id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className={`badge ${filter === "all" ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setFilter("all")}>Hepsi · {orders.length}</button>
        {STATUSES.map(([k, l]) => {
          const n = orders.filter(o => o.status === k).length;
          return <button key={k} className={`badge ${filter === k ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setFilter(k)}>{l} · {n}</button>;
        })}
      </div>

      {list.length === 0 ? (
        <Empty title="Bu filtrede sipariş yok" hint="Shopify'da SMM ürünü satıldığında webhook ile buraya düşer." />
      ) : (
        <div className="space-y-3">
          {list.map(o => {
            let options: Record<string, string> = {};
            try { options = JSON.parse(o.optionsJson); } catch {}
            return (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.shopifyOrderName} · {o.productTitle}{o.variantLabel ? ` / ${o.variantLabel}` : ""}</p>
                    <p className="mt-0.5 text-xs text-muted">{new Date(o.createdAt).toLocaleString("tr-TR")} · Servis ID: <span className="font-mono">{o.providerServiceId ?? "—"}</span> · Miktar: {o.quantity}{o.refill ? ` · Refill: ${o.refill}` : ""}</p>
                    {o.targetLink ? <p className="mt-1 break-all text-sm">🔗 <a href={o.targetLink} target="_blank" rel="noreferrer" className="text-pine-700 hover:underline">{o.targetLink}</a></p> : <p className="mt-1 text-sm text-danger">Hedef link eksik!</p>}
                    {Object.keys(options).length > 0 ? (
                      <p className="mt-1 text-xs text-muted">{Object.entries(options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tone(o.status)}>{label(o.status)}</Badge>
                    <button className="btn-ghost text-xs" onClick={() => copy(o)}>{copied === o.id ? "Kopyalandı ✓" : "Kopyala"}</button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="text-xs font-semibold text-muted">Durum:</span>
                  {STATUSES.map(([k, l]) => (
                    <button key={k} disabled={busy === o.id || o.status === k}
                      className={`badge ${o.status === k ? "bg-pine-100 text-pine-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      onClick={() => setStatus(o.id, k)}>{l}</button>
                  ))}
                  <input className="input ml-auto max-w-xs !py-1 text-xs" placeholder="Not (panel sipariş no vb.) — Enter ile kaydet"
                    defaultValue={o.notes}
                    onKeyDown={e => { if (e.key === "Enter") saveNotes(o.id, (e.target as HTMLInputElement).value); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

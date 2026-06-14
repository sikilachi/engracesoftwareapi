"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type Order = {
  id: string; shopifyOrderName: string | null; productTitle: string; providerOrderId: string | null;
  targetLink: string | null; refillValidUntil: string | null; status: string;
};
type Refill = {
  id: string; smmOrderId: string; providerOrderId: string | null; status: string; notes: string | null; createdAt: string;
};

export default function SmmRefillsClient({ orders, refills }: { orders: Order[]; refills: Refill[] }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/smm/refills", { method: "POST", body: JSON.stringify({ smmOrderId: orderId, notes }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Refill request submitted" : data.error ?? "Refill request failed");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="card h-fit space-y-3 p-5">
        <h2 className="text-sm font-bold">Manual refill request</h2>
        <div>
          <label className="label">Eligible SMM order</label>
          <select className="input" value={orderId} onChange={e => setOrderId(e.target.value)}>
            {orders.map(o => <option key={o.id} value={o.id}>{o.shopifyOrderName ?? o.id} - {o.productTitle} - {o.providerOrderId}</option>)}
          </select>
        </div>
        <div><label className="label">Notes</label><textarea className="input min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <button className="btn-primary w-full justify-center" disabled={busy || !orderId} onClick={submit}>{busy ? "Submitting..." : "Request refill"}</button>
        {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      </div>
      <div className="space-y-3">
        {refills.length === 0 ? <Empty title="No refill requests yet" hint="Completed provider orders with a valid refill window can be sent here." /> : null}
        {refills.map(r => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold">Provider order {r.providerOrderId ?? "-"}</p>
                <p className="text-xs text-muted">SMM order {r.smmOrderId} - {new Date(r.createdAt).toLocaleString()}</p>
                {r.notes ? <p className="mt-1 text-sm text-muted">{r.notes}</p> : null}
              </div>
              <Badge tone={r.status === "submitted" ? "green" : r.status === "failed" ? "red" : "amber"}>{r.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

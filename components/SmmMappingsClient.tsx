"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type Provider = { id: string; name: string };
type Mapping = {
  id: string; shopifyProductId: string; shopifyVariantId: string | null; platform: string; serviceType: string;
  country: string | null; gender: string | null; refillDays: number | null; speed: string | null; quality: string | null;
  minQuantity: number; maxQuantity: number; providerId: string; providerServiceId: string; costPer1000: number;
  salePricePer1000: number; active: boolean; priority: number; provider: Provider;
};

const EMPTY = {
  shopifyProductId: "", shopifyVariantId: "", platform: "instagram", serviceType: "followers", country: "",
  gender: "", refillDays: "", speed: "", quality: "", minQuantity: "1", maxQuantity: "1000000",
  providerId: "", providerServiceId: "", costPer1000: "", salePricePer1000: "", priority: "0",
};

export default function SmmMappingsClient({ mappings, providers }: { mappings: Mapping[]; providers: Provider[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function add() {
    setBusy("add"); setMsg(null);
    const res = await fetch("/api/smm/mappings", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg(data.error ?? "Mapping could not be saved");
    setForm(EMPTY);
    router.refresh();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/smm/mappings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this service mapping?")) return;
    await fetch(`/api/smm/mappings/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {msg ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">{msg}</div> : null}
        {mappings.length === 0 ? <Empty title="No mappings yet" hint="Create the routing rules that connect Shopify product options to provider service IDs." /> : null}
        {mappings.map(m => (
          <div key={m.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{m.platform} / {m.serviceType}</p>
                  <Badge tone={m.active ? "green" : "neutral"}>{m.active ? "Active" : "Inactive"}</Badge>
                  <Badge tone="blue">Priority {m.priority}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">Product {m.shopifyProductId}{m.shopifyVariantId ? ` / variant ${m.shopifyVariantId}` : ""}</p>
                <p className="text-xs text-muted">
                  {m.country || "Any country"} / {m.gender || "Any gender"} / refill {m.refillDays ?? "any"} / qty {m.minQuantity}-{m.maxQuantity}
                </p>
                <p className="text-xs text-muted">{m.provider.name} service <span className="font-mono">{m.providerServiceId}</span> - cost {m.costPer1000} / sale {m.salePricePer1000}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" disabled={busy === m.id} onClick={() => patch(m.id, { active: !m.active })}>{m.active ? "Disable" : "Enable"}</button>
                <button className="btn-danger" disabled={busy === m.id} onClick={() => remove(m.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card h-fit space-y-3 p-5">
        <h2 className="text-sm font-bold">Create service mapping</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Shopify product ID</label><input className="input" value={form.shopifyProductId} onChange={e => set("shopifyProductId", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Shopify variant ID optional</label><input className="input" value={form.shopifyVariantId} onChange={e => set("shopifyVariantId", e.target.value)} /></div>
          <div><label className="label">Platform</label><input className="input" value={form.platform} onChange={e => set("platform", e.target.value)} /></div>
          <div><label className="label">Service type</label><input className="input" value={form.serviceType} onChange={e => set("serviceType", e.target.value)} /></div>
          <div><label className="label">Country</label><input className="input" value={form.country} onChange={e => set("country", e.target.value)} /></div>
          <div><label className="label">Gender</label><input className="input" value={form.gender} onChange={e => set("gender", e.target.value)} /></div>
          <div><label className="label">Refill days</label><input className="input" type="number" value={form.refillDays} onChange={e => set("refillDays", e.target.value)} /></div>
          <div><label className="label">Speed</label><input className="input" value={form.speed} onChange={e => set("speed", e.target.value)} /></div>
          <div><label className="label">Quality</label><input className="input" value={form.quality} onChange={e => set("quality", e.target.value)} /></div>
          <div><label className="label">Priority</label><input className="input" type="number" value={form.priority} onChange={e => set("priority", e.target.value)} /></div>
          <div><label className="label">Min qty</label><input className="input" type="number" value={form.minQuantity} onChange={e => set("minQuantity", e.target.value)} /></div>
          <div><label className="label">Max qty</label><input className="input" type="number" value={form.maxQuantity} onChange={e => set("maxQuantity", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Provider</label><select className="input" value={form.providerId} onChange={e => set("providerId", e.target.value)}><option value="">Select</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label">Provider service ID</label><input className="input" value={form.providerServiceId} onChange={e => set("providerServiceId", e.target.value)} /></div>
          <div><label className="label">Cost / 1000</label><input className="input" type="number" step="0.0001" value={form.costPer1000} onChange={e => set("costPer1000", e.target.value)} /></div>
          <div><label className="label">Sale / 1000</label><input className="input" type="number" step="0.0001" value={form.salePricePer1000} onChange={e => set("salePricePer1000", e.target.value)} /></div>
        </div>
        <button className="btn-primary w-full justify-center" disabled={busy === "add"} onClick={add}>Save mapping</button>
      </div>
    </div>
  );
}

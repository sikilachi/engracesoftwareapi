"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type Provider = { id: string; name: string };
type Service = {
  id: string; providerServiceId: string; name: string; category: string | null; platform: string | null;
  serviceType: string | null; rate: number; min: number | null; max: number | null; refillSupported: boolean;
  provider: Provider;
};

export default function SmmProviderServicesClient({ services, providers }: { services: Service[]; providers: Provider[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? services.filter(s => `${s.name} ${s.category} ${s.platform} ${s.serviceType} ${s.providerServiceId}`.toLowerCase().includes(q.toLowerCase()))
    : services;

  async function refresh(providerId: string) {
    setBusy(providerId);
    await fetch(`/api/smm/providers/${providerId}/services`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label">Search provider services</label>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="instagram followers germany refill" />
          </div>
          {providers.map(p => (
            <button key={p.id} className="btn-ghost" disabled={busy !== null} onClick={() => refresh(p.id)}>
              {busy === p.id ? "Refreshing..." : `Refresh ${p.name}`}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? <Empty title="No imported provider services" hint="Refresh services from an active SMM provider first." /> : null}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th">Provider</th><th className="th">Service</th><th className="th">Platform</th><th className="th">Type</th><th className="th">Rate</th><th className="th">Min/Max</th><th className="th">Refill</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-t border-line">
                <td className="td">{s.provider.name}</td>
                <td className="td"><p className="font-medium">{s.name}</p><p className="font-mono text-xs text-muted">{s.providerServiceId} - {s.category ?? "No category"}</p></td>
                <td className="td">{s.platform ?? "-"}</td>
                <td className="td">{s.serviceType ?? "-"}</td>
                <td className="td tabular-nums">{s.rate}</td>
                <td className="td tabular-nums">{s.min ?? "?"} / {s.max ?? "?"}</td>
                <td className="td"><Badge tone={s.refillSupported ? "green" : "neutral"}>{s.refillSupported ? "Yes" : "No"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

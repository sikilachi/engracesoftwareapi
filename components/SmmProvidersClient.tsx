"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty } from "./ui";

type Provider = {
  id: string; name: string; baseUrl: string; active: boolean; status: string;
  healthMessage: string | null; balance: number | null; currency: string | null; serviceCount: number;
};

export default function SmmProvidersClient({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", baseUrl: "https://example.com/api/v2", apiKey: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    setBusy("add"); setMsg(null);
    const res = await fetch("/api/smm/providers", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg(data.error ?? "Provider could not be saved");
    setForm({ name: "", baseUrl: "https://example.com/api/v2", apiKey: "" });
    router.refresh();
  }

  async function action(id: string, kind: "test" | "services" | "toggle" | "delete", active?: boolean) {
    if (kind === "delete" && !confirm("Delete this SMM provider and imported services?")) return;
    setBusy(id + kind); setMsg(null);
    const url = kind === "test" ? `/api/smm/providers/${id}/test`
      : kind === "services" ? `/api/smm/providers/${id}/services`
      : `/api/smm/providers/${id}`;
    const res = await fetch(url, {
      method: kind === "toggle" ? "PATCH" : kind === "delete" ? "DELETE" : "POST",
      body: kind === "toggle" ? JSON.stringify({ active: !active }) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok ? (data.message ?? (data.saved != null ? `Imported ${data.saved} services` : "Saved")) : data.error ?? "Request failed");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {msg ? <div className="rounded-lg border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700">{msg}</div> : null}
        {providers.length === 0 ? <Empty title="No SMM providers yet" hint="Add a provider API URL and key. Keys are encrypted and never exposed to the theme." /> : null}
        {providers.map(p => (
          <div key={p.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.name}</p>
                  <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>
                  <Badge tone={p.status === "ok" ? "green" : p.status === "error" ? "red" : "neutral"}>{p.status}</Badge>
                </div>
                <p className="mt-1 break-all text-xs text-muted">{p.baseUrl}</p>
                <p className="text-xs text-muted">{p.serviceCount} services - balance {p.balance ?? "?"} {p.currency ?? ""}</p>
                {p.healthMessage ? <p className="mt-1 text-xs text-pine-700">{p.healthMessage}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost" disabled={busy !== null} onClick={() => action(p.id, "test")}>Test</button>
                <button className="btn-primary" disabled={busy !== null} onClick={() => action(p.id, "services")}>Import services</button>
                <button className="btn-ghost" disabled={busy !== null} onClick={() => action(p.id, "toggle", p.active)}>{p.active ? "Deactivate" : "Activate"}</button>
                <button className="btn-danger" disabled={busy !== null} onClick={() => action(p.id, "delete")}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card h-fit space-y-3 p-5">
        <h2 className="text-sm font-bold">Add SMM provider</h2>
        <div><label className="label">Provider name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><label className="label">API base URL</label><input className="input" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} /></div>
        <div><label className="label">API key</label><input className="input" type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} /></div>
        <button className="btn-primary w-full justify-center" disabled={busy === "add" || !form.name || !form.baseUrl || !form.apiKey} onClick={add}>Add provider</button>
      </div>
    </div>
  );
}

import { decrypt } from "./crypto";
import { detectPlatform, detectServiceType } from "./smm-platforms";

export type SmmProviderAuth = { baseUrl: string; apiKeyEnc: string };

async function smmCall(provider: SmmProviderAuth, params: Record<string, string | number>) {
  const body = new URLSearchParams({ key: decrypt(provider.apiKeyEnc) });
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));
  const res = await fetch(provider.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`SMM HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function testSmmProvider(provider: SmmProviderAuth) {
  const data = await smmCall(provider, { action: "balance" });
  return {
    ok: true,
    message: `Connection OK. Balance: ${data.balance ?? "?"} ${data.currency ?? ""}`.trim(),
    balance: data.balance != null ? Number(data.balance) : null,
    currency: data.currency ? String(data.currency) : null,
  };
}

export async function fetchSmmProviderServices(provider: SmmProviderAuth) {
  const data = await smmCall(provider, { action: "services" });
  const rows: any[] = Array.isArray(data) ? data : data.services ?? [];
  return rows.map(row => {
    const name = String(row.name ?? row.title ?? "Untitled service");
    const category = row.category != null ? String(row.category) : null;
    return {
      providerServiceId: String(row.service ?? row.id),
      name,
      category,
      platform: detectPlatform(name, category ?? ""),
      serviceType: detectServiceType(name, category ?? ""),
      rate: Number(row.rate ?? 0),
      min: row.min != null ? Number(row.min) : null,
      max: row.max != null ? Number(row.max) : null,
      refillSupported: String(row.refill ?? "").toLowerCase() === "true" || row.refill === true || row.refill === 1,
      rawJson: JSON.stringify(row).slice(0, 12000),
    };
  }).filter(row => row.providerServiceId);
}

export async function submitProviderOrder(provider: SmmProviderAuth, params: { service: string; link: string; quantity: number }) {
  return smmCall(provider, { action: "add", service: params.service, link: params.link, quantity: params.quantity });
}

export async function fetchProviderOrderStatus(provider: SmmProviderAuth, providerOrderId: string) {
  return smmCall(provider, { action: "status", order: providerOrderId });
}

export async function requestProviderRefill(provider: SmmProviderAuth, providerOrderId: string) {
  return smmCall(provider, { action: "refill", order: providerOrderId });
}

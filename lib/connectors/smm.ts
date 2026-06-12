// Standart SMM Panel API v2 (smmturk.org, Peakerr, JAP ve türevleri)
// POST {baseUrl}  body: key=API_KEY&action=services  → servis listesi
import type { ConnectorCtx, NormalizedProduct, SupplierConnector } from "./types";

async function call(ctx: ConnectorCtx, params: Record<string, string>) {
  const body = new URLSearchParams({ key: ctx.apiKey, ...params });
  const res = await fetch(ctx.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`SMM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function detectPlatform(name: string, category: string): string {
  const s = `${name} ${category}`.toLowerCase();
  const map: [string, string][] = [
    ["instagram", "instagram"], ["tiktok", "tiktok"], ["youtube", "youtube"],
    ["telegram", "telegram"], ["twitch", "twitch"], ["discord", "discord"],
    ["facebook", "facebook"], ["twitter", "x"], [" x ", "x"], ["snapchat", "snapchat"],
    ["spotify", "spotify"], ["trustpilot", "trustpilot"], ["linkedin", "linkedin"],
  ];
  for (const [k, v] of map) if (s.includes(k)) return v;
  return "other";
}

export const smmConnector: SupplierConnector = {
  type: "smm",

  async test(ctx) {
    try {
      const data = await call(ctx, { action: "balance" });
      if (data?.error) return { ok: false, message: `SMM API hatası: ${data.error}` };
      return { ok: true, message: `SMM bağlantısı başarılı. Bakiye: ${data.balance ?? "?"} ${data.currency ?? ""}` };
    } catch (e: any) {
      return { ok: false, message: `SMM API erişilemedi: ${e.message}` };
    }
  },

  async fetchCategories(ctx) {
    const data = await call(ctx, { action: "services" });
    const items: any[] = Array.isArray(data) ? data : data.services ?? [];
    const cats = Array.from(new Set(items.map((s: any) => String(s.category ?? "")).filter(Boolean)));
    return cats.sort();
  },

  async browseByCategory(ctx, category, opts) {
    const data = await call(ctx, { action: "services" });
    const items: any[] = (Array.isArray(data) ? data : data.services ?? [])
      .filter((s: any) => String(s.category ?? "") === category);
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 200;
    const paged = items.slice((page - 1) * limit, page * limit);
    return paged.map((s): NormalizedProduct => {
      const platform = detectPlatform(String(s.name ?? ""), String(s.category ?? ""));
      return {
        supplierProductId: String(s.service ?? s.id),
        title: s.name ?? "Untitled service",
        description: s.description ?? undefined,
        platform, deliveryType: "smm_service",
        supplierCategory: s.category ?? "SMM", supplierStatus: "available",
        currency: (ctx.config?.currency as string) ?? "USD",
        costPrice: Number(s.rate ?? 0), stock: Number(s.max ?? 0),
        images: [], tags: [platform, s.type].filter(Boolean) as string[],
        meta: { ratePer1000: Number(s.rate ?? 0), min: Number(s.min ?? 0), max: Number(s.max ?? 0), type: s.type, refill: s.refill },
      };
    });
  },

  async fetchProducts(ctx) {
    const data = await call(ctx, { action: "services" });
    const items: any[] = Array.isArray(data) ? data : data.services ?? [];
    return items.map((s): NormalizedProduct => {
      const platform = detectPlatform(String(s.name ?? ""), String(s.category ?? ""));
      return {
        supplierProductId: String(s.service ?? s.id),
        title: s.name ?? "Untitled service",
        description: s.description ?? undefined,
        platform,
        deliveryType: "smm_service",
        supplierCategory: s.category ?? "SMM",
        supplierStatus: "available",
        currency: (ctx.config?.currency as string) ?? "USD",
        // SMM API fiyatı 1000 adet içindir → birim maliyeti meta'da tutulur
        costPrice: Number(s.rate ?? 0),
        stock: Number(s.max ?? 0),
        images: [],
        tags: [platform, s.type].filter(Boolean) as string[],
        meta: {
          ratePer1000: Number(s.rate ?? 0), min: Number(s.min ?? 0), max: Number(s.max ?? 0),
          type: s.type, refill: s.refill, cancel: s.cancel, dripfeed: s.dripfeed,
          averageTime: s.average_time,
        },
      };
    });
  },
};

// Sipariş gönderme — Otomasyon modülü bunu kullanır (varsayılan kapalı)
export async function submitSmmOrder(ctx: ConnectorCtx, params: { service: string; link: string; quantity: number }) {
  return call(ctx, { action: "add", service: params.service, link: params.link, quantity: String(params.quantity) });
}
export async function smmOrderStatus(ctx: ConnectorCtx, orderId: string) {
  return call(ctx, { action: "status", order: orderId });
}

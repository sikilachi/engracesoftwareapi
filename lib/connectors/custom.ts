// Genel amaçlı konnektör: gelecekteki tedarikçiler için.
// configJson ile alan eşleme yapılır, örn:
// { "listPath": "data.products", "fields": { "id": "sku", "title": "name", "price": "cost", "stock": "quantity" }, "authHeader": "X-Api-Key" }
import type { ConnectorCtx, NormalizedProduct, SupplierConnector } from "./types";

function dig(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export const customConnector: SupplierConnector = {
  type: "custom",

  async test(ctx) {
    try {
      const authHeader = (ctx.config?.authHeader as string) ?? "Authorization";
      const res = await fetch(ctx.baseUrl, { headers: { [authHeader]: ctx.apiKey } });
      return res.ok
        ? { ok: true, message: "Custom API bağlantısı başarılı" }
        : { ok: false, message: `Custom API HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: `Custom API erişilemedi: ${e.message}` };
    }
  },

  async fetchProducts(ctx) {
    const cfg = ctx.config ?? {};
    const authHeader = (cfg.authHeader as string) ?? "Authorization";
    const res = await fetch(ctx.baseUrl, { headers: { [authHeader]: ctx.apiKey } });
    if (!res.ok) throw new Error(`Custom API HTTP ${res.status}`);
    const data = await res.json();
    const list: any[] = cfg.listPath ? dig(data, cfg.listPath as string) ?? [] : Array.isArray(data) ? data : [];
    const f = (cfg.fields as Record<string, string>) ?? {};

    return list.map((p): NormalizedProduct => ({
      supplierProductId: String(dig(p, f.id ?? "id")),
      title: String(dig(p, f.title ?? "title") ?? "Untitled"),
      description: dig(p, f.description ?? "description"),
      platform: dig(p, f.platform ?? "platform"),
      region: dig(p, f.region ?? "region"),
      supplierCategory: dig(p, f.category ?? "category") ?? "Other",
      currency: String(dig(p, f.currency ?? "currency") ?? (cfg.currency as string) ?? "EUR"),
      costPrice: Number(dig(p, f.price ?? "price") ?? 0),
      stock: Number(dig(p, f.stock ?? "stock") ?? 0),
      images: [dig(p, f.image ?? "image")].filter(Boolean),
      tags: [],
      meta: { raw: p },
    }));
  },
};

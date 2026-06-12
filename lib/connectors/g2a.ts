// G2A Integration API — https://api.g2a.com
// Auth: Authorization: <apiKey>, <apiSecret>  (G2A export API formatı)
import type { ConnectorCtx, NormalizedProduct, SupplierConnector } from "./types";

function headers(ctx: ConnectorCtx) {
  return { Authorization: `${ctx.apiKey}, ${ctx.apiSecret ?? ""}` };
}

export const g2aConnector: SupplierConnector = {
  type: "g2a",

  async test(ctx) {
    try {
      const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?page=1`, { headers: headers(ctx) });
      if (!res.ok) return { ok: false, message: `G2A HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
      return { ok: true, message: "G2A bağlantısı başarılı" };
    } catch (e: any) {
      return { ok: false, message: `G2A erişilemedi: ${e.message}` };
    }
  },

  async fetchProducts(ctx, opts) {
    const page = opts?.page ?? 1;
    const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?page=${page}`, { headers: headers(ctx) });
    if (!res.ok) throw new Error(`G2A HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const items: any[] = data.docs ?? data.products ?? data.data ?? [];

    return items.map((p): NormalizedProduct => ({
      supplierProductId: String(p.id ?? p.productId),
      title: p.name ?? "Untitled",
      description: p.description,
      platform: p.platform != null ? String(p.platform) : undefined,
      region: p.region != null ? String(p.region) : undefined,
      supplierCategory: Array.isArray(p.categories) && p.categories[0]?.name ? p.categories[0].name : "Games",
      supplierStatus: (p.qty ?? 0) > 0 ? "available" : "out_of_stock",
      deliveryType: "instant_key",
      currency: "EUR",
      costPrice: Number(p.minPrice ?? p.price ?? 0),
      stock: Number(p.qty ?? 0),
      images: [p.thumbnail, p.smallImage, p.coverImage, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean),
      tags: (Array.isArray(p.categories) ? p.categories.map((c: any) => c.name) : []).filter(Boolean),
      meta: {
        slug: p.slug, type: p.type, releaseDate: p.releaseDate,
        developer: p.developer, publisher: p.publisher,
        restrictions: p.restrictions, requirements: p.requirements,
        availableToBuy: p.availableToBuy, updatedAt: p.updatedAt,
      },
    }));
  },
};

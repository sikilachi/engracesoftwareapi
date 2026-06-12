// Kinguin Integration API — https://api.kinguin.net
// Auth: X-Api-Key header. Ürün listesi: GET /v1/products?page=&limit=
import type { ConnectorCtx, NormalizedProduct, SupplierConnector } from "./types";

const str = (v: unknown) => (v == null ? undefined : String(v));

export const kinguinConnector: SupplierConnector = {
  type: "kinguin",

  async test(ctx) {
    try {
      const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?limit=1`, {
        headers: { "X-Api-Key": ctx.apiKey },
      });
      if (!res.ok) return { ok: false, message: `Kinguin HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
      return { ok: true, message: "Kinguin bağlantısı başarılı" };
    } catch (e: any) {
      return { ok: false, message: `Kinguin erişilemedi: ${e.message}` };
    }
  },

  async fetchProducts(ctx, opts) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 100, 100);
    const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?page=${page}&limit=${limit}`, {
      headers: { "X-Api-Key": ctx.apiKey },
    });
    if (!res.ok) throw new Error(`Kinguin HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const items: any[] = data.results ?? data.products ?? [];

    return items.map((p): NormalizedProduct => ({
      supplierProductId: String(p.kinguinId ?? p.productId ?? p.id),
      title: p.name ?? p.originalName ?? "Untitled",
      description: p.description,
      platform: str(p.platform),
      region: str(p.regionalLimitations ?? p.regionId),
      language: Array.isArray(p.languages) ? p.languages.join(", ") : str(p.languages),
      activationType: str(p.activationDetails ? "key" : undefined),
      activationInstructions: str(p.activationDetails),
      deliveryType: "instant_key",
      licenseType: str(p.genre),
      supplierCategory: Array.isArray(p.genres) ? p.genres[0] : str(p.genre) ?? "Games",
      supplierStatus: p.qty > 0 ? "available" : "out_of_stock",
      currency: "EUR",
      costPrice: Number(p.price ?? 0),
      stock: Number(p.qty ?? p.textQty ?? 0),
      images: [
        ...(p.images?.cover?.url ? [p.images.cover.url] : []),
        ...((p.images?.screenshots ?? []).map((s: any) => s.url).filter(Boolean)),
        ...(p.coverImage ? [p.coverImage] : []),
      ],
      tags: [
        ...(Array.isArray(p.genres) ? p.genres : []),
        ...(Array.isArray(p.tags) ? p.tags : []),
        ...(p.platform ? [String(p.platform)] : []),
      ],
      meta: {
        kinguinId: p.kinguinId, productId: p.productId,
        releaseDate: p.releaseDate, developers: p.developers, publishers: p.publishers,
        systemRequirements: p.systemRequirements, ageRating: p.ageRating,
        steam: p.steam, metacriticScore: p.metacriticScore, offersCount: p.offersCount,
        cheapestOfferId: p.cheapestOfferId, updatedAt: p.updatedAt,
      },
    }));
  },
};

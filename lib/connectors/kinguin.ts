// Kinguin Integration API — https://api.kinguin.net
// Auth: X-Api-Key header. Ürün listesi: GET /v1/products?page=&limit=
import type { ConnectorCtx, NormalizedProduct, SupplierConnector } from "./types";

const str = (v: unknown) => (v == null ? undefined : String(v));

function newestSortParams(opts?: { sortBy?: string; sortType?: "asc" | "desc" }) {
  return {
    sortBy: opts?.sortBy ?? "updatedAt",
    sortType: opts?.sortType ?? "desc",
  };
}

function newestScore(p: any): number {
  const date = Date.parse(p.updatedAt ?? p.releaseDate ?? p.createdAt ?? p.created_at ?? "");
  if (!Number.isNaN(date)) return date;
  return Number(p.kinguinId ?? p.productId ?? p.id ?? 0);
}

function newestFirst(items: any[]) {
  return [...items].sort((a, b) => newestScore(b) - newestScore(a));
}

function toProduct(p: any): NormalizedProduct {
  return {
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
  };
}

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

  async fetchCategories(ctx) {
    try {
      const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/genres`, { headers: { "X-Api-Key": ctx.apiKey } });
      if (res.ok) {
        const data = await res.json();
        const genres: string[] = Array.isArray(data) ? data.map((g: any) => g.name ?? g).filter(Boolean) : [];
        if (genres.length) return genres.sort();
      }
    } catch {}
    // fallback: ilk sayfadan çıkar
    const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?limit=100`, { headers: { "X-Api-Key": ctx.apiKey } });
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data.results ?? data.products ?? [];
    const cats = Array.from(new Set(items.flatMap((p: any) => Array.isArray(p.genres) ? p.genres : [p.genre]).filter(Boolean) as string[]));
    return cats.sort();
  },

  async browseByCategory(ctx, category, opts) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 100, 100);
    const sort = newestSortParams(opts);
    const res = await fetch(
      `${ctx.baseUrl.replace(/\/$/, "")}/v1/products?genres[]=${encodeURIComponent(category)}&page=${page}&limit=${limit}&sortBy=${encodeURIComponent(sort.sortBy)}&sortType=${sort.sortType}`,
      { headers: { "X-Api-Key": ctx.apiKey } }
    );
    if (!res.ok) throw new Error(`Kinguin HTTP ${res.status}`);
    const data = await res.json();
    const items: any[] = data.results ?? data.products ?? [];
    return newestFirst(items).map(toProduct);
  },

  async search(ctx, query) {
    const base = ctx.baseUrl.replace(/\/$/, "");
    // Sayısal ise kinguinId ile ara, değilse name ile
    const isId = /^\d+$/.test(query.trim());
    const url = isId
      ? `${base}/v1/products?kinguinId=${query.trim()}&limit=50&sortBy=updatedAt&sortType=desc`
      : `${base}/v1/products?name=${encodeURIComponent(query)}&limit=50&sortBy=updatedAt&sortType=desc`;
    const res = await fetch(url, { headers: { "X-Api-Key": ctx.apiKey } });
    if (!res.ok) throw new Error(`Kinguin HTTP ${res.status}`);
    const data = await res.json();
    const items: any[] = data.results ?? data.products ?? [];
    return newestFirst(items).map(toProduct);
  },

  async fetchProducts(ctx, opts) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 100, 100);
    const sort = newestSortParams(opts);
    const res = await fetch(`${ctx.baseUrl.replace(/\/$/, "")}/v1/products?page=${page}&limit=${limit}&sortBy=${encodeURIComponent(sort.sortBy)}&sortType=${sort.sortType}`, {
      headers: { "X-Api-Key": ctx.apiKey },
    });
    if (!res.ok) throw new Error(`Kinguin HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const items: any[] = data.results ?? data.products ?? [];

    return newestFirst(items).map(toProduct);
  },
};

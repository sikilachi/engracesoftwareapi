// Shopify Admin GraphQL servis katmanı (tek mağaza, custom app)

const DOMAIN = () => process.env.SHOPIFY_STORE_DOMAIN ?? "";
const VERSION = () => process.env.SHOPIFY_API_VERSION ?? "2025-01";
const CLIENT_ID = () => process.env.SHOPIFY_CLIENT_ID ?? process.env.SHOPIFY_ADMIN_TOKEN ?? "";
const CLIENT_SECRET = () => process.env.SHOPIFY_CLIENT_SECRET ?? "";

// In-memory token cache (Vercel instance başına geçerli)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  // Statik admin token varsa direkt kullan
  const staticToken = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
  if (staticToken.startsWith("shpat_")) return staticToken;

  const secret = CLIENT_SECRET();
  const id = CLIENT_ID();

  const res = await fetch(`https://${DOMAIN()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, client_secret: secret }),
  });
  const text = await res.text();
  let data: { access_token?: string; expires_in?: number; error?: string; error_description?: string } = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Shopify token yanıtı JSON değil (HTTP ${res.status}): ${text.slice(0, 300)}`); }
  if (!data.access_token) throw new Error(`Shopify token alınamadı: ${data.error ?? ""} ${data.error_description ?? ""} — store: ${DOMAIN()}`);

  cachedToken = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 86399) - 60) * 1000 };
  return cachedToken.token;
}

export function shopifyConfigured() {
  return Boolean(DOMAIN() && (CLIENT_ID() || CLIENT_SECRET()));
}

export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!shopifyConfigured()) throw new Error("Shopify yapılandırılmamış. .env içinde SHOPIFY_STORE_DOMAIN ve SHOPIFY_CLIENT_ID/SECRET gerekli.");
  const token = await getAccessToken();
  const res = await fetch(`https://${DOMAIN()}/admin/api/${VERSION()}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`Shopify GraphQL hatası: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`);
  }
  return body.data as T;
}

export async function getPrimaryLocationId(): Promise<string> {
  const data = await gql<{ locations: { nodes: { id: string }[] } }>(
    `query { locations(first: 1) { nodes { id } } }`
  );
  const id = data.locations.nodes[0]?.id;
  if (!id) throw new Error("Shopify lokasyonu bulunamadı");
  return id;
}

export async function ensureCollection(title: string): Promise<string> {
  const found = await gql<{ collections: { nodes: { id: string; title: string }[] } }>(
    `query($q: String!) { collections(first: 10, query: $q) { nodes { id title } } }`,
    { q: `title:'${title.replace(/'/g, "\\'")}'` }
  );
  const exact = found.collections.nodes.find(c => c.title.toLowerCase() === title.toLowerCase());
  if (exact) return exact.id;
  const created = await gql<{ collectionCreate: { collection: { id: string } | null; userErrors: { message: string }[] } }>(
    `mutation($input: CollectionInput!) { collectionCreate(input: $input) { collection { id } userErrors { message } } }`,
    { input: { title } }
  );
  if (!created.collectionCreate.collection) throw new Error(`Koleksiyon oluşturulamadı: ${created.collectionCreate.userErrors.map(e => e.message).join(", ")}`);
  return created.collectionCreate.collection.id;
}

export async function addToCollections(productId: string, collectionIds: string[]) {
  for (const id of collectionIds) {
    await gql(
      `mutation($id: ID!, $productIds: [ID!]!) { collectionAddProducts(id: $id, productIds: $productIds) { userErrors { message } } }`,
      { id, productIds: [productId] }
    );
  }
}

export type Publication = { id: string; name: string; autoPublish?: boolean };

export async function listPublications(): Promise<Publication[]> {
  const data = await gql<{ publications: { nodes: Publication[] } }>(
    `query {
      publications(first: 50) {
        nodes { id name autoPublish }
      }
    }`
  );
  return data.publications.nodes;
}

export async function publishToPublications(productId: string, publicationIds: string[]) {
  const ids = Array.from(new Set(publicationIds.filter(Boolean)));
  if (!ids.length) return;
  const data = await gql<{ publishablePublish: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    { id: productId, input: ids.map(publicationId => ({ publicationId })) }
  );
  const errs = data.publishablePublish.userErrors;
  if (errs?.length) throw new Error(`SatÄ±ÅŸ kanalÄ± hatasÄ±: ${errs.map(e => e.message).join("; ")}`);
}

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export type PublishInput = {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: "ACTIVE" | "DRAFT";
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventoryQty: number;
  trackInventory: boolean;
  requiresShipping: boolean;
  images: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  metafields: { key: string; value: string; namespace?: string; type?: string }[];
  templateSuffix?: string | null;
  existingShopifyId?: string | null;
  variants?: { title: string; sku: string; price: number; options: string[] }[];
  optionNames?: string[];
};

export type PublishResult = { productId: string; created: boolean };

// productSet: idempotent oluştur/güncelle (2024-10+)
export async function publishProduct(input: PublishInput): Promise<PublishResult> {
  const metafields = input.metafields
    .filter(m => m.value != null && m.value !== "")
    .map(m => ({ namespace: m.namespace ?? "engrace", key: m.key, type: m.type ?? "multi_line_text_field", value: String(m.value).slice(0, 60000) }));

  const productSetInput: Record<string, unknown> = {
    title: input.title,
    descriptionHtml: input.descriptionHtml,
    vendor: input.vendor,
    productType: input.productType,
    tags: input.tags,
    status: input.status,
    handle: slugify(input.title),
    seo: { title: input.seoTitle ?? input.title, description: input.seoDescription ?? undefined },
    ...(input.templateSuffix ? { templateSuffix: input.templateSuffix } : {}),
    metafields,
    files: input.images.slice(0, 10).map(url => ({ originalSource: url, contentType: "IMAGE" })),
  };

  if (input.variants && input.variants.length > 0 && input.optionNames) {
    productSetInput.productOptions = input.optionNames.map((name, i) => ({
      name,
      values: Array.from(new Set(input.variants!.map(v => v.options[i]).filter(Boolean))).map(n => ({ name: n })),
    }));
    productSetInput.variants = input.variants.map(v => ({
      sku: v.sku,
      price: String(v.price),
      optionValues: v.options.map((val, i) => ({ optionName: input.optionNames![i], name: val })),
      inventoryItem: { tracked: input.trackInventory, requiresShipping: input.requiresShipping },
    }));
  } else {
    productSetInput.variants = [{
      sku: input.sku,
      price: String(input.price),
      compareAtPrice: input.compareAtPrice != null ? String(input.compareAtPrice) : undefined,
      inventoryItem: { tracked: input.trackInventory, requiresShipping: input.requiresShipping },
      optionValues: [{ optionName: "Title", name: "Default Title" }],
    }];
    productSetInput.productOptions = [{ name: "Title", values: [{ name: "Default Title" }] }];
  }

  if (input.existingShopifyId) productSetInput.id = input.existingShopifyId;

  const data = await gql<{ productSet: { product: { id: string; variants: { nodes: { id: string; inventoryItem: { id: string } }[] } } | null; userErrors: { field: string[]; message: string }[] } }>(
    `mutation($input: ProductSetInput!) {
      productSet(input: $input) {
        product { id variants(first: 50) { nodes { id inventoryItem { id } } } }
        userErrors { field message }
      }
    }`,
    { input: productSetInput }
  );

  if (!data.productSet.product) {
    throw new Error(`Shopify ürün hatası: ${data.productSet.userErrors.map(e => e.message).join("; ")}`);
  }

  const productId = data.productSet.product.id;

  // Stok ayarla (tekli varyant, takipli ürünler)
  if (input.trackInventory && !input.variants && data.productSet.product.variants.nodes[0]?.inventoryItem?.id) {
    await setInventory(data.productSet.product.variants.nodes[0].inventoryItem.id, input.inventoryQty);
  }

  return { productId, created: !input.existingShopifyId };
}

// productSet, tanımı olmayan metafield'ları sessizce düşürebiliyor.
// srd.* gibi tanımsız metafield'ları garanti yazmak için ayrı metafieldsSet kullan.
export async function setMetafields(
  ownerId: string,
  fields: { namespace: string; key: string; type: string; value: string | null | undefined }[]
) {
  const metafields = fields
    .filter(m => m.value != null && String(m.value).trim() !== "")
    .map(m => ({ ownerId, namespace: m.namespace, key: m.key, type: m.type, value: String(m.value).slice(0, 60000) }));
  if (!metafields.length) return;
  const data = await gql<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation($m: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $m) { metafields { key } userErrors { field message } }
    }`,
    { m: metafields }
  );
  const errs = data.metafieldsSet.userErrors;
  if (errs?.length) throw new Error(`Metafield hatası: ${errs.map(e => e.message).join("; ")}`);
}

export async function setInventory(inventoryItemId: string, qty: number) {
  const { getSettings, saveSettings } = await import("./settings");
  const settings = await getSettings();
  let locationId = settings.shopifyLocationId;
  if (!locationId) {
    locationId = await getPrimaryLocationId();
    await saveSettings({ shopifyLocationId: locationId });
  }
  await gql(
    `mutation($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) { userErrors { message } }
    }`,
    {
      input: {
        name: "available",
        reason: "correction",
        ignoreCompareQuantity: true,
        quantities: [{ inventoryItemId, locationId, quantity: qty }],
      },
    }
  );
}

export async function getVariantInventoryItem(shopifyProductId: string): Promise<{ variantId: string; inventoryItemId: string } | null> {
  const data = await gql<{ product: { variants: { nodes: { id: string; inventoryItem: { id: string } }[] } } | null }>(
    `query($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id inventoryItem { id } } } } }`,
    { id: shopifyProductId }
  );
  const v = data.product?.variants.nodes[0];
  return v ? { variantId: v.id, inventoryItemId: v.inventoryItem.id } : null;
}

export async function updateVariantPrice(shopifyProductId: string, price: number, compareAt: number | null) {
  const data = await gql<{ product: { variants: { nodes: { id: string }[] } } | null }>(
    `query($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id } } } }`,
    { id: shopifyProductId }
  );
  const variantId = data.product?.variants.nodes[0]?.id;
  if (!variantId) throw new Error("Shopify varyantı bulunamadı");
  await gql(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } }
    }`,
    { productId: shopifyProductId, variants: [{ id: variantId, price: String(price), compareAtPrice: compareAt != null ? String(compareAt) : null }] }
  );
}

// Tüm tedarikçi API'leri bu ortak yapıya normalize edilir.
export type NormalizedProduct = {
  supplierProductId: string;
  title: string;
  description?: string;
  shortDescription?: string;
  usageInstructions?: string;
  activationInstructions?: string;
  platform?: string;
  region?: string;
  language?: string;
  edition?: string;
  licenseType?: string;
  deliveryType?: string;
  activationType?: string;
  supplierCategory?: string;
  supplierStatus?: string;
  currency: string;
  costPrice: number;
  stock: number;
  images: string[];
  tags: string[];
  meta: Record<string, unknown>; // API'ye özgü tüm benzersiz alanlar burada saklanır
};

export type ConnectorCtx = {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  config?: Record<string, unknown>;
};

export interface SupplierConnector {
  type: string;
  test(ctx: ConnectorCtx): Promise<{ ok: boolean; message: string }>;
  fetchProducts(ctx: ConnectorCtx, opts?: { page?: number; limit?: number }): Promise<NormalizedProduct[]>;
}

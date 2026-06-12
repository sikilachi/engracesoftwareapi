import { prisma } from "./db";

export type StockRule = {
  mode: "divisor" | "fixed" | "passthrough";
  divisor: number;   // varsayılan 4 → Shopify stok = floor(kaynak/4)
  cap: number;       // Shopify'da asla bundan fazla gösterme
  min: number;
};

export type AppSettings = {
  storeCurrency: string;
  fxRates: Record<string, number>; // 1 birim yabancı para = X mağaza parası
  stockRule: StockRule;
  applyStockRuleToSmm: boolean;
  shopifyLocationId?: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  storeCurrency: "EUR",
  fxRates: { EUR: 1, USD: 0.92, TRY: 0.027 },
  stockRule: { mode: "divisor", divisor: 4, cap: 5, min: 0 },
  applyStockRuleToSmm: false,
};

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "app" } });
  if (!row) return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }; } catch { return DEFAULT_SETTINGS; }
}

export async function saveSettings(s: Partial<AppSettings>) {
  const current = await getSettings();
  const next = { ...current, ...s };
  await prisma.setting.upsert({
    where: { key: "app" },
    create: { key: "app", value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

import type { StockRule } from "./settings";

// Stok koruması: tedarikçi stoğunu asla birebir yansıtma.
// Varsayılan: floor(kaynak / 4), üst sınır cap, kaynak 0 ise 0.
export function computeShopifyStock(sourceStock: number, rule: StockRule): number {
  if (sourceStock <= 0) return 0;
  let qty: number;
  switch (rule.mode) {
    case "passthrough": qty = sourceStock; break;
    case "fixed": qty = rule.cap; break;
    case "divisor":
    default: qty = Math.floor(sourceStock / Math.max(1, rule.divisor));
  }
  qty = Math.min(qty, rule.cap);
  qty = Math.max(qty, rule.min);
  if (sourceStock > 0 && qty === 0 && rule.mode !== "divisor") qty = rule.min;
  return qty;
}

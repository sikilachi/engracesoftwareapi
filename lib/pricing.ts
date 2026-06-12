import { prisma } from "./db";
import type { AppSettings } from "./settings";

export type PriceResult = {
  cost: number;          // mağaza para birimine çevrilmiş maliyet
  price: number;         // satış fiyatı
  compareAt: number | null;
  margin: number;
  marginPct: number;
  ruleName: string;
};

type RuleRow = {
  id: string; name: string; scope: string; supplierId: string | null;
  category: string | null; productId: string | null; markupType: string;
  markupValue: number; minProfit: number; rounding: string;
  compareAtMultiplier: number | null; priority: number; active: boolean;
};

function applyRounding(v: number, mode: string): number {
  if (mode === "charm99") return charm99(v);
  if (mode === "whole" || mode === "round") return Math.ceil(v);
  return Math.round(v * 100) / 100;
}

// charm99 düzeltmesi: her zaman fiyatın ÜZERİNE en yakın .99'a yuvarla
function charm99(v: number): number {
  const floor99 = Math.floor(v) + 0.99;
  return floor99 >= v ? floor99 : Math.floor(v) + 1.99;
}

export function computePrice(opts: {
  costPrice: number;
  currency: string;
  settings: AppSettings;
  rule: { markupType: string; markupValue: number; minProfit: number; rounding: string; compareAtMultiplier: number | null; name: string } | null;
  priceOverride?: number | null;
}): PriceResult {
  const { costPrice, currency, settings, rule, priceOverride } = opts;
  const fx = settings.fxRates[currency] ?? 1;
  const cost = Math.round(costPrice * fx * 100) / 100;

  if (priceOverride != null && priceOverride > 0) {
    const margin = priceOverride - cost;
    return {
      cost, price: priceOverride, compareAt: null,
      margin: Math.round(margin * 100) / 100,
      marginPct: cost > 0 ? Math.round((margin / cost) * 10000) / 100 : 100,
      ruleName: "Manuel fiyat",
    };
  }

  const r = rule ?? { markupType: "percent", markupValue: 30, minProfit: 0, rounding: "charm99", compareAtMultiplier: null, name: "Varsayılan %30" };
  let price = r.markupType === "fixed" ? cost + r.markupValue : cost * (1 + r.markupValue / 100);
  if (price - cost < r.minProfit) price = cost + r.minProfit;
  price = r.rounding === "charm99" ? charm99(price) : applyRounding(price, r.rounding);

  const compareAt = r.compareAtMultiplier ? (r.rounding === "charm99" ? charm99(price * r.compareAtMultiplier) : Math.round(price * r.compareAtMultiplier * 100) / 100) : null;
  const margin = Math.round((price - cost) * 100) / 100;
  return {
    cost, price: Math.round(price * 100) / 100, compareAt,
    margin, marginPct: cost > 0 ? Math.round((margin / cost) * 10000) / 100 : 100,
    ruleName: r.name,
  };
}

// Özgüllük sırası: product > category > supplier > global; eşitlikte priority büyük kazanır
export async function resolveRule(p: { id: string; supplierId: string; supplierCategory: string | null }) {
  const rules = (await prisma.priceRule.findMany({ where: { active: true } })) as RuleRow[];
  const score = (r: RuleRow) =>
    r.scope === "product" && r.productId === p.id ? 4000 + r.priority :
    r.scope === "category" && r.category && r.category === p.supplierCategory ? 3000 + r.priority :
    r.scope === "supplier" && r.supplierId === p.supplierId ? 2000 + r.priority :
    r.scope === "global" ? 1000 + r.priority : -1;
  const candidates = rules.map(r => ({ r, s: score(r) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s);
  return candidates[0]?.r ?? null;
}

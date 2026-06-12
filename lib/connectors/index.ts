import { kinguinConnector } from "./kinguin";
import { g2aConnector } from "./g2a";
import { smmConnector } from "./smm";
import { customConnector } from "./custom";
import type { SupplierConnector, ConnectorCtx } from "./types";
import { decrypt } from "../crypto";
import { jget } from "../json";

const registry: Record<string, SupplierConnector> = {
  kinguin: kinguinConnector,
  g2a: g2aConnector,
  smm: smmConnector,
  custom: customConnector,
};

export function getConnector(type: string): SupplierConnector {
  const c = registry[type];
  if (!c) throw new Error(`Bilinmeyen tedarikçi tipi: ${type}`);
  return c;
}

export function ctxFromSupplier(s: { baseUrl: string; apiKeyEnc: string; apiSecretEnc: string | null; configJson: string | null }): ConnectorCtx {
  return {
    baseUrl: s.baseUrl,
    apiKey: decrypt(s.apiKeyEnc),
    apiSecret: s.apiSecretEnc ? decrypt(s.apiSecretEnc) : undefined,
    config: jget<Record<string, unknown>>(s.configJson, {}),
  };
}

export const SUPPLIER_DEFAULT_URLS: Record<string, string> = {
  kinguin: "https://gateway.kinguin.net/esa/api",
  g2a: "https://api.g2a.com",
  smm: "https://smmturk.org/api/v2",
  custom: "",
};

import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import AutomationClient from "@/components/AutomationClient";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [configs, suppliers] = await Promise.all([
    prisma.automationConfig.findMany({ include: { group: { include: { variants: true } } } }),
    prisma.supplier.findMany({ where: { type: "smm" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Otomasyon (Hazır Modül)" sub="Varsayılan KAPALI. Açıldığında SMM siparişleri sağlayıcıya otomatik iletilebilir." />
      <AutomationClient
        configs={configs.map(c => ({
          id: c.id, enabled: c.enabled, mode: c.mode, supplierId: c.supplierId,
          lastTestAt: c.lastTestAt?.toISOString() ?? null, lastTestResult: c.lastTestResult,
          groupTitle: c.group.title, groupPlatform: c.group.platform, variantCount: c.group.variants.length,
        }))}
        suppliers={suppliers}
      />
    </div>
  );
}

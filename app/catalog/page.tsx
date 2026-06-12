import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import CatalogClient from "@/components/CatalogClient";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true, type: true } });
  return (
    <div>
      <PageHeader title="Katalog" sub="Tedarikçi API'sinden canlı göz at, seçtiklerini içe aktar." />
      <CatalogClient suppliers={suppliers} />
    </div>
  );
}

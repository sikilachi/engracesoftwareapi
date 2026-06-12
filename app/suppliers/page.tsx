import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import SuppliersClient from "@/components/SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <div>
      <PageHeader title="Tedarikçiler" sub="API konnektörleri: anahtarlar şifreli saklanır, asla düz metin tutulmaz." />
      <SuppliersClient suppliers={suppliers.map(s => ({
        id: s.id, name: s.name, type: s.type, baseUrl: s.baseUrl, status: s.status,
        healthMessage: s.healthMessage, lastSyncAt: s.lastSyncAt?.toISOString() ?? null,
        productCount: s._count.products,
      }))} />
    </div>
  );
}

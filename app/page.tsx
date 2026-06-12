import Link from "next/link";
import { prisma } from "@/lib/db";
import { Stat, Badge, PageHeader } from "@/components/ui";
import { shopifyConfigured } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [total, published, review, missingImg, stockCh, priceCh, suppliers, jobs, failedJobs, pendingSmm, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { state: "published" } }),
    prisma.product.count({ where: { state: "fetched" } }),
    prisma.product.count({ where: { imagesJson: "[]" } }),
    prisma.product.count({ where: { stockChanged: true } }),
    prisma.product.count({ where: { priceChanged: true } }),
    prisma.supplier.findMany(),
    prisma.syncJob.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.syncJob.count({ where: { status: "failed" } }),
    prisma.smmOrder.count({ where: { status: "pending" } }),
    prisma.product.findMany({ where: { sellingPrice: { not: null } }, select: { costPrice: true, sellingPrice: true, currency: true }, take: 2000 }),
  ]);

  const totalMargin = products.reduce((acc, p) => acc + ((p.sellingPrice ?? 0) - p.costPrice), 0);

  return (
    <div>
      <PageHeader title="Dashboard" sub="Tedarikçiden Shopify'a: çek, incele, yayınla.">
        <Link href="/suppliers" className="btn-ghost">Ürün çek</Link>
        <Link href="/products" className="btn-ghost">Stok / fiyat senkronu</Link>
        <Link href="/smm-orders" className="btn-primary">SMM sipariş kuyruğu</Link>
      </PageHeader>

      {/* İş akışı şeridi — çek → incele → yayınla */}
      <div className="card mb-6 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
          {[
            { n: total, t: "Çekilen ürün", d: "Tüm tedarikçilerden normalize edildi", href: "/suppliers" },
            { n: review, t: "İnceleme bekliyor", d: "Yayın öncesi kontrol kuyruğu", href: "/products?state=fetched" },
            { n: published, t: "Shopify'da yayında", d: "Mağazaya gönderilen ürünler", href: "/products?state=published" },
          ].map((s, i) => (
            <Link key={i} href={s.href} className="group relative p-5 hover:bg-pine-50/60 transition-colors">
              <p className="text-3xl font-bold tabular-nums text-pine-700">{s.n}</p>
              <p className="mt-1 font-semibold text-sm">{s.t}</p>
              <p className="text-xs text-muted">{s.d}</p>
              {i < 2 && <span className="hidden sm:block absolute right-[-9px] top-1/2 -translate-y-1/2 z-10 text-line group-hover:text-pine-600">▶</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <Stat label="Görseli eksik" value={missingImg} hint="İnceleme filtresinde işaretli" />
        <Stat label="Stok değişti" value={stockCh} hint="Tedarikçi stoğu güncellendi" />
        <Stat label="Fiyat değişti" value={priceCh} hint="Maliyet değişimi algılandı" />
        <Stat label="Tahmini toplam kâr" value={totalMargin.toFixed(2)} hint="Satış − maliyet (fiyatlanmış ürünler)" accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">API sağlık durumu</h2>
            <Badge tone={shopifyConfigured() ? "green" : "amber"}>
              Shopify {shopifyConfigured() ? "bağlı" : "yapılandırılmadı"}
            </Badge>
          </div>
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted">Henüz tedarikçi yok. <Link className="text-pine-700 font-semibold" href="/suppliers">Tedarikçi ekle →</Link></p>
          ) : (
            <ul className="divide-y divide-line">
              {suppliers.map(s => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted">{s.type} · son senkron: {s.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString("tr-TR") : "—"}</p>
                  </div>
                  <Badge tone={s.status === "ok" ? "green" : s.status === "error" ? "red" : "neutral"}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Son senkron işleri</h2>
            <div className="flex gap-2">
              {failedJobs > 0 && <Badge tone="red">{failedJobs} başarısız</Badge>}
              {pendingSmm > 0 && <Link href="/smm-orders"><Badge tone="amber">{pendingSmm} SMM bekliyor</Badge></Link>}
            </div>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">Henüz iş çalışmadı.</p>
          ) : (
            <ul className="divide-y divide-line">
              {jobs.map(j => (
                <li key={j.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold capitalize">{j.type}</p>
                    <p className="text-xs text-muted">{new Date(j.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={j.status === "done" ? "green" : j.status === "failed" ? "red" : "blue"}>{j.status}</Badge>
                    <p className="text-xs text-muted mt-0.5 tabular-nums">{j.success} ✓ / {j.failed} ✗</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const TONE: Record<string, "neutral" | "green" | "amber" | "red" | "blue"> = {
  info: "blue", warn: "amber", error: "red",
};

export default async function LogsPage({ searchParams }: { searchParams: { level?: string; area?: string } }) {
  const where: Record<string, unknown> = {};
  if (searchParams.level) where.level = searchParams.level;
  if (searchParams.area) where.area = searchParams.area;
  const [logs, areas] = await Promise.all([
    prisma.logEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.logEntry.groupBy({ by: ["area"] }),
  ]);

  const link = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { ...searchParams, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/logs?${s}` : "/logs";
  };

  return (
    <div>
      <PageHeader title="Loglar" sub="Tüm fetch, senkron, yayın ve webhook olayları. Son 300 kayıt." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <a className={`badge ${!searchParams.level ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} href={link({ level: undefined })}>Hepsi</a>
        {["info", "warn", "error"].map(l => (
          <a key={l} className={`badge ${searchParams.level === l ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} href={link({ level: l })}>{l}</a>
        ))}
        <span className="mx-2 text-line">|</span>
        <a className={`badge ${!searchParams.area ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} href={link({ area: undefined })}>Tüm alanlar</a>
        {areas.map(a => (
          <a key={a.area} className={`badge ${searchParams.area === a.area ? "bg-pine-600 text-white" : "bg-gray-100 text-gray-600"}`} href={link({ area: a.area })}>{a.area}</a>
        ))}
      </div>
      {logs.length === 0 ? (
        <Empty title="Log yok" hint="Bir tedarikçiden ürün çekince burada görünür." />
      ) : (
        <div className="card divide-y divide-line">
          {logs.map(l => (
            <div key={l.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5 text-sm">
              <span className="w-36 shrink-0 text-xs tabular-nums text-muted">{l.createdAt.toLocaleString("tr-TR")}</span>
              <Badge tone={TONE[l.level] ?? "neutral"}>{l.level}</Badge>
              <Badge tone="neutral">{l.area}</Badge>
              <span className="min-w-0 flex-1 break-words">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  type: string;
  status: string;
  total: number;
  success: number;
  failed: number;
  detail: string | null;
};

const LABELS: Record<string, string> = {
  publish: "Shopify yayını",
  stock: "Stok senkronu",
  price: "Fiyat senkronu",
  full: "Stok + fiyat senkronu",
  fetch: "Ürün çekme",
};

export default function LiveProgress({
  active,
  types,
  startedAt,
  fallbackLabel = "İşlem sürüyor",
}: {
  active: boolean;
  types: string[];
  startedAt: string | null;
  fallbackLabel?: string;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const query = useMemo(() => types.join(","), [types]);

  useEffect(() => {
    if (!active || !startedAt || !query) {
      setJob(null);
      return;
    }

    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/sync-jobs?types=${encodeURIComponent(query)}&after=${encodeURIComponent(startedAt)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setJob(data.id ? data : null);
    }

    load();
    const timer = window.setInterval(load, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, query, startedAt]);

  if (!active) return null;

  const processed = (job?.success ?? 0) + (job?.failed ?? 0);
  const total = job?.total ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const label = job ? LABELS[job.type] ?? fallbackLabel : fallbackLabel;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-pine-900/20 bg-white p-4 shadow-pop">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-pine-950">{label}</p>
          <p className="mt-0.5 text-xs text-muted">{job?.detail ?? "İşlem başladı, canlı durum alınıyor..."}</p>
        </div>
        <span className="rounded-md bg-pine-50 px-2 py-1 text-xs font-bold tabular-nums text-pine-800">
          {total > 0 ? `${pct}%` : "..."}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-pine-600 transition-all duration-500 ${total === 0 ? "animate-pulse" : ""}`}
          style={{ width: total > 0 ? `${Math.max(3, pct)}%` : "38%" }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="tabular-nums">{processed}{total > 0 ? ` / ${total}` : ""} adım işlendi</span>
        <span className="tabular-nums">{job ? `${job.success} başarılı, ${job.failed} hatalı` : "hazırlanıyor"}</span>
      </div>
    </div>
  );
}

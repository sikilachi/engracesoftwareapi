import React from "react";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-600",
    green: "bg-pine-100 text-pine-700",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-red-50 text-danger",
    blue: "bg-sky-50 text-sky-700",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-pine-700" : "text-ink"}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-pine-50 flex items-center justify-center text-pine-700 font-bold">∅</div>
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {sub ? <p className="mt-0.5 text-sm text-muted">{sub}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

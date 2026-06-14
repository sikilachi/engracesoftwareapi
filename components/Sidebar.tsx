"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppSettings } from "@/lib/settings";

type IconName = "home" | "truck" | "search" | "box" | "map" | "tag" | "chart" | "server" | "list" | "route" | "cart" | "alert" | "refresh" | "file" | "image" | "zap" | "settings";

const NAV: { group: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { group: "Genel", items: [
    { href: "/", label: "Dashboard", icon: "home" },
  ]},
  { group: "Katalog", items: [
    { href: "/suppliers", label: "Tedarikciler", icon: "truck" },
    { href: "/catalog", label: "Katalog Gez", icon: "search" },
    { href: "/products", label: "Urunler", icon: "box" },
    { href: "/mapping", label: "Kategori Esleme", icon: "map" },
    { href: "/price-rules", label: "Fiyat Kurallari", icon: "tag" },
  ]},
  { group: "SMM Automation", items: [
    { href: "/smm-dashboard", label: "SMM Dashboard", icon: "chart" },
    { href: "/smm-providers", label: "SMM Providers", icon: "server" },
    { href: "/smm-provider-services", label: "Provider Services", icon: "list" },
    { href: "/smm-service-mappings", label: "Service Mappings", icon: "route" },
    { href: "/smm-orders", label: "SMM Orders", icon: "cart" },
    { href: "/smm-failed-orders", label: "Failed Orders", icon: "alert" },
    { href: "/smm-refill-requests", label: "Refill Requests", icon: "refresh" },
    { href: "/logs", label: "Logs", icon: "file" },
  ]},
  { group: "Legacy SMM", items: [
    { href: "/smm", label: "SMM Products", icon: "box" },
    { href: "/logos", label: "Logo Manager", icon: "image" },
    { href: "/automation", label: "Old Automation", icon: "zap" },
  ]},
  { group: "Sistem", items: [
    { href: "/settings", label: "App Ayarlari", icon: "settings" },
  ]},
];

const PATHS: Record<IconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 10v10h5v-6h4v6h5V10"],
  truck: ["M3 7h11v8H3z", "M14 10h4l3 3v2h-7z", "M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4"],
  search: ["M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15", "M16 16l5 5"],
  box: ["M4 8l8-4 8 4-8 4-8-4z", "M4 8v8l8 4 8-4V8", "M12 12v8"],
  map: ["M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z", "M9 4v14", "M15 6v14"],
  tag: ["M20 13 13 20 4 11V4h7l9 9z", "M7.5 7.5h.01"],
  chart: ["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V8", "M16 16v-8"],
  server: ["M4 5h16v6H4z", "M4 13h16v6H4z", "M8 8h.01", "M8 16h.01"],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  route: ["M5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M19 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M7 4h5a4 4 0 0 1 0 8h-2a4 4 0 0 0 0 8h7"],
  cart: ["M4 4h2l2 11h10l2-7H7", "M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2", "M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2"],
  alert: ["M12 3 2 20h20L12 3z", "M12 9v5", "M12 17h.01"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M19 12a7 7 0 0 0-12-5", "M5 12a7 7 0 0 0 12 5"],
  file: ["M6 3h8l4 4v14H6z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  image: ["M4 5h16v14H4z", "M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M4 17l5-5 4 4 2-2 5 5"],
  zap: ["M13 2 4 14h7l-1 8 9-12h-7l1-8z"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6", "M19 12a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7.1 7.1 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7.1 7.1 0 0 0 .1-1z"],
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function BrandMark({ settings }: { settings: AppSettings }) {
  if (settings.appLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={settings.appLogoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-cover" />
    );
  }
  return <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 font-black text-white">{settings.appName.slice(0, 1).toUpperCase() || "E"}</div>;
}

export default function Sidebar({ settings }: { settings: AppSettings }) {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col text-pine-50 lg:flex" style={{ backgroundColor: "var(--app-sidebar)" }}>
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <BrandMark settings={settings} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none tracking-tight">{settings.appName}</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-pine-100/50">{settings.appSubtitle}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map(g => (
          <div key={g.group}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-pine-100/40">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map(it => {
                const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link href={it.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active ? "font-semibold text-white" : "text-pine-100/70 hover:bg-white/5 hover:text-white"
                      }`}
                      style={active ? { backgroundColor: "var(--app-accent)" } : undefined}>
                      <span className="grid h-5 w-5 place-items-center opacity-90"><Icon name={it.icon} /></span>
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-pine-100/40">
        Tek magaza - Custom App
      </div>
    </aside>
  );
}

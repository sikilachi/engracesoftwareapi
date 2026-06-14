"use client";
import { useState } from "react";
import Link from "next/link";
import type { AppSettings } from "@/lib/settings";

const LINKS = [
  ["/", "Dashboard"],
  ["/suppliers", "Tedarikciler"],
  ["/catalog", "Katalog Gez"],
  ["/products", "Urunler"],
  ["/mapping", "Kategori Esleme"],
  ["/price-rules", "Fiyat Kurallari"],
  ["/smm-dashboard", "SMM Dashboard"],
  ["/smm-providers", "SMM Providers"],
  ["/smm-provider-services", "Provider Services"],
  ["/smm-service-mappings", "Service Mappings"],
  ["/smm-orders", "SMM Orders"],
  ["/smm-failed-orders", "Failed Orders"],
  ["/smm-refill-requests", "Refill Requests"],
  ["/logs", "Logs"],
  ["/settings", "App Ayarlari"],
];

function BrandMark({ settings }: { settings: AppSettings }) {
  if (settings.appLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={settings.appLogoUrl} alt="" className="h-7 w-7 rounded-md bg-white object-cover" />
    );
  }
  return <div className="grid h-7 w-7 place-items-center rounded-md bg-white/15 text-sm font-black">{settings.appName.slice(0, 1).toUpperCase() || "E"}</div>;
}

export default function MobileNav({ settings }: { settings: AppSettings }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 text-white lg:hidden" style={{ backgroundColor: "var(--app-sidebar)" }}>
      <div className="flex min-w-0 items-center gap-2">
        <BrandMark settings={settings} />
        <span className="truncate text-sm font-bold">{settings.appName}</span>
      </div>
      <button onClick={() => setOpen(!open)} className="rounded-md border border-white/20 px-3 py-1 text-sm">Menu</button>
      {open && (
        <div className="absolute left-0 right-0 top-full border-t border-white/10 px-4 pb-4" style={{ backgroundColor: "var(--app-sidebar)" }}>
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-2.5 text-sm text-pine-100/80">{label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { group: "Genel", items: [
    { href: "/", label: "Dashboard", icon: "▦" },
  ]},
  { group: "Katalog", items: [
    { href: "/suppliers", label: "Tedarikçiler", icon: "⇄" },
    { href: "/catalog", label: "Katalog Gez", icon: "⊞" },
    { href: "/products", label: "Ürünler (DB)", icon: "▤" },
    { href: "/mapping", label: "Kategori Eşleme", icon: "⌥" },
    { href: "/price-rules", label: "Fiyat Kuralları", icon: "₺" },
  ]},
  { group: "SMM", items: [
    { href: "/smm", label: "SMM Ürünleri", icon: "◎" },
    { href: "/smm-orders", label: "SMM Siparişleri", icon: "☰" },
    { href: "/logos", label: "Logo Yöneticisi", icon: "❑" },
    { href: "/automation", label: "Otomasyon", icon: "⚙" },
  ]},
  { group: "Sistem", items: [
    { href: "/logs", label: "Loglar", icon: "≡" },
    { href: "/settings", label: "Ayarlar", icon: "✦" },
  ]},
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-pine-950 text-pine-50 lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-pine-600 text-white font-black">E</div>
        <div>
          <p className="text-sm font-bold leading-none tracking-tight">Engrace</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-pine-100/50 mt-1">Software</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(g => (
          <div key={g.group}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-pine-100/40">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map(it => {
                const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link href={it.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active ? "bg-pine-600/90 text-white font-semibold" : "text-pine-100/70 hover:bg-white/5 hover:text-white"
                      }`}>
                      <span className="w-4 text-center opacity-80">{it.icon}</span>
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10 text-[11px] text-pine-100/40">
        Tek mağaza · Custom App
      </div>
    </aside>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";

const LINKS = [
  ["/catalog", "Katalog Gez"],
  ["/", "Dashboard"], ["/suppliers", "Tedarikçiler"], ["/products", "Ürünler"],
  ["/mapping", "Kategori Eşleme"], ["/price-rules", "Fiyat Kuralları"],
  ["/smm", "SMM Ürünleri"], ["/smm-orders", "SMM Siparişleri"],
  ["/logos", "Logo Yöneticisi"], ["/automation", "Otomasyon"],
  ["/logs", "Loglar"], ["/settings", "Ayarlar"],
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-pine-950 px-4 py-3 text-white">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-pine-600 font-black text-sm">E</div>
        <span className="font-bold text-sm">Engrace</span>
      </div>
      <button onClick={() => setOpen(!open)} className="rounded-md border border-white/20 px-3 py-1 text-sm">Menü</button>
      {open && (
        <div className="absolute left-0 right-0 top-full bg-pine-950 border-t border-white/10 px-4 pb-4">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-pine-100/80 border-b border-white/5">{label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

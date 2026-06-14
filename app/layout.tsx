import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Engrace Software",
  description: "Supplier-to-Shopify import & sync console",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const themeVars = {
    "--app-accent": settings.accentColor,
    "--app-sidebar": settings.sidebarColor,
  } as CSSProperties;

  return (
    <html lang="tr">
      <body style={themeVars}>
        <Sidebar settings={settings} />
        <MobileNav settings={settings} />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}

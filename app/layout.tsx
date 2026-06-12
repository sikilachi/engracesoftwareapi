import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Engrace Software",
  description: "Supplier-to-Shopify import & sync console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}

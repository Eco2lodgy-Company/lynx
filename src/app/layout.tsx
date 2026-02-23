import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "ECOTECH — Gestion de Chantier",
    template: "%s | ECOTECH",
  },
  description:
    "Plateforme ECOTECH : Solution de gestion de chantier développée par Next Grade Services (NGS). Suivi de projets, pointage, rapports et communication en temps réel.",
  keywords: ["gestion chantier", "BTP", "construction", "ECOTECH", "NGS"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ECOTECH",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

import PWAManager from "@/components/PWAManager";
import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} font-sans bg-background-dark text-slate-100 min-h-screen antialiased`}
      >
        <Providers>
          <PWAManager />
          {children}
        </Providers>
      </body>
    </html>
  );
}

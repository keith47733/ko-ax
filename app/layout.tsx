import AppHeader from "@/components/AppHeader";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import React, { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Kura | Personal Media Storehouse",
  description: "Japandi Minimalist Personal Media Storehouse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} flex min-h-screen flex-col bg-canvas font-sans text-zinc-800 antialiased`}
      >
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>

        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}

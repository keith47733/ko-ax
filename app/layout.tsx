import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import AppHeader from "@/components/AppHeader";
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
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} min-h-screen bg-[#F4F3F0] text-zinc-800 font-sans antialiased flex flex-col`}
      >
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>

        <main className="flex-1 p-3 sm:p-4 md:p-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}

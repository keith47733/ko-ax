"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import KoaxLogo from "@/components/Logo";
import "./globals.css";

interface NavItem {
  id: string;
  label: string;
  href: string;
  viewParam: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "want_to_watch",
    label: "Want to Watch",
    href: "/?view=want_to_watch",
    viewParam: "want_to_watch",
  },
  {
    id: "watching",
    label: "Watching",
    href: "/?view=watching",
    viewParam: "watching",
  },
  {
    id: "watched",
    label: "Watched",
    href: "/?view=watched",
    viewParam: "watched",
  },
  {
    id: "calendar",
    label: "Release Calendar",
    href: "/?view=calendar",
    viewParam: "calendar",
  },
];

function SidebarNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "watching";

  return (
    <nav aria-label="Primary Sidebar Navigation" className="divide-y-2 divide-black border-b-2 border-black">
      {NAV_ITEMS.map((item) => {
        const isCalendarRoute =
          pathname === "/calendar" && item.viewParam === "calendar";
        const isHomeView =
          pathname === "/" && currentView === item.viewParam;
        const isActive = isCalendarRoute || isHomeView;

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={`block px-4 py-3 text-xs font-bold uppercase tracking-wide ${
              isActive
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-neutral-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{item.label}</span>
              <span className="text-xs">{isActive ? "●" : ""}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-black flex flex-col">
        {/* =================================================================
            TOP HEADER WIREFRAME
            Contains: Sidebar Toggle, Logo Placeholder, Global Search Form
            (strictly routing to /search?q=query on Enter), and User Dropdown.
           ================================================================= */}
        <header className="border-b-2 border-black bg-white sticky top-0 z-30">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            {/* Left: Sidebar Collapse Button & Logo Placeholder */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-expanded={isSidebarOpen}
                aria-controls="koax-sidebar"
                className="border-2 border-black px-2.5 py-1.5 text-xs font-bold uppercase bg-white hover:bg-black hover:text-white cursor-pointer"
              >
                {isSidebarOpen ? "[HIDE NAV]" : "[SHOW NAV]"}
              </button>

              <Link
                href="/"
                className="border-2 border-black bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-100"
              >
                <KoaxLogo className="w-8 h-5 text-black shrink-0" />
                <span className="font-extrabold tracking-widest text-sm">KO-AX</span>
              </Link>
            </div>

            {/* Center: Global Search Form (Strictly routes to /search?q=query on Enter) */}
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="flex-1 max-w-xl mx-2 flex border-2 border-black bg-white"
            >
              <label htmlFor="global-search-input" className="sr-only">
                Search movies and TV shows
              </label>
              <input
                id="global-search-input"
                type="search"
                 name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH MOVIES & TV (ENTER TO SEARCH)..."
                className="w-full px-3 py-1.5 text-xs bg-white text-black placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                className="border-l-2 border-black px-3 py-1.5 text-xs font-bold uppercase bg-black text-white hover:bg-neutral-800 cursor-pointer shrink-0"
              >
                ENTER
              </button>
            </form>

            {/* Right: User Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className="border-2 border-black px-3 py-1.5 text-xs font-bold uppercase bg-white hover:bg-neutral-200 cursor-pointer flex items-center gap-2"
              >
                <span className="inline-block w-2.5 h-2.5 border border-black bg-neutral-400" />
                <span>USER MENU {isUserMenuOpen ? "▴" : "▾"}</span>
              </button>

              {isUserMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-56 border-2 border-black bg-white z-40 divide-y-2 divide-black text-xs uppercase"
                >
                  <div className="px-3 py-2 bg-neutral-100 font-bold">
                    ACCOUNT
                  </div>
                  <Link
                    href="/auth"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-3 py-2 font-bold hover:bg-black hover:text-white"
                  >
                    SIGN IN / SIGN UP
                  </Link>
                  <Link
                    href="/?view=watching"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-3 py-2 hover:bg-neutral-200"
                  >
                    MY TRACKED MEDIA
                  </Link>
                  <Link
                    href="/calendar"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-3 py-2 hover:bg-neutral-200"
                  >
                    RELEASE RADAR (/calendar)
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =================================================================
            MAIN SHELL BODY (Collapsible Left Sidebar + Main Viewing Pane)
           ================================================================= */}
        <div className="flex-1 flex flex-col md:flex-row">
          {isSidebarOpen && (
            <aside
              id="koax-sidebar"
              className="w-full md:w-64 shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-black bg-white flex flex-col justify-between"
            >
              <div>
                <div className="px-4 py-2 border-b-2 border-black bg-neutral-200 text-[11px] font-bold uppercase">
                  LOCAL VIEWS // NAVIGATION
                </div>

                <Suspense
                  fallback={
                    <div className="p-4 text-xs uppercase">LOADING NAV...</div>
                  }
                >
                  <SidebarNavLinks />
                </Suspense>
              </div>

              <div className="p-3 border-t-2 border-black bg-neutral-100 text-[10px] uppercase font-bold tracking-wider text-neutral-600">
                KO-AX MEDIA TRACKER
              </div>
            </aside>
          )}

          {/* Unified Main Viewing Pane */}
          <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}

"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import KoaxLogo from "@/components/Logo";
import {
  BookmarkIcon,
  CalendarIcon,
  CheckCircleIcon,
  CompassIcon,
  EyeIcon,
  MenuIcon,
  XIcon as CloseIcon,
} from "@/components/Icons";
import "./globals.css";

interface NavItem {
  id: string;
  label: string;
  href: string;
  viewParam: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "want_to_watch",
    label: "Want to Watch",
    href: "/?view=want_to_watch",
    viewParam: "want_to_watch",
    icon: BookmarkIcon,
  },
  {
    id: "watching",
    label: "Watching",
    href: "/?view=watching",
    viewParam: "watching",
    icon: EyeIcon,
  },
  {
    id: "watched",
    label: "Watched",
    href: "/?view=watched",
    viewParam: "watched",
    icon: CheckCircleIcon,
  },
  {
    id: "discover",
    label: "What to Watch Next",
    href: "/discover",
    viewParam: "discover",
    icon: CompassIcon,
  },
  {
    id: "calendar",
    label: "Release Calendar",
    href: "/?view=calendar",
    viewParam: "calendar",
    icon: CalendarIcon,
  },
];

function SidebarNavigation({
  isDrawerOpen,
  onToggleDrawer,
  onNavigate,
}: {
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "watching";

  return (
    <div className="flex flex-col justify-between h-full select-none">
      {/* Top Section: Hamburger / Collapse Toggle Button (Row 0) + Nav Items */}
      <div>
        {/* Row 0: Expand / Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-expanded={isDrawerOpen}
          aria-label={
            isDrawerOpen ? "Collapse navigation" : "Expand navigation"
          }
          title={
            isDrawerOpen ? "Collapse navigation (Esc)" : "Expand navigation"
          }
          className={`w-full flex items-center h-12 transition-colors border-b-2 border-black cursor-pointer ${
            isDrawerOpen
              ? "bg-neutral-100 hover:bg-neutral-200 text-black"
              : "justify-center bg-white hover:bg-neutral-200 text-black"
          }`}
        >
          <span className="w-14 h-12 flex items-center justify-center shrink-0">
            {isDrawerOpen ? (
              <CloseIcon className="w-5 h-5" />
            ) : (
              <MenuIcon className="w-5 h-5" />
            )}
          </span>
          {isDrawerOpen && (
            <div className="flex-1 flex items-center justify-between pr-4 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider truncate">
                COLLAPSE
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                ESC
              </span>
            </div>
          )}
        </button>

        {/* Nav Items (Tracker, Discovery Engine, Release Calendar) */}
        <nav
          aria-label="Primary Navigation"
          className="divide-y-2 divide-black border-b-2 border-black"
        >
          {NAV_ITEMS.map((item) => {
            const isDiscoverRoute =
              pathname.startsWith("/discover") && item.id === "discover";
            const isCalendarRoute =
              item.id === "calendar" &&
              (pathname === "/calendar" ||
                (pathname === "/" && currentView === "calendar"));
            const isHomeView =
              pathname === "/" && currentView === item.viewParam;
            const isActive = isDiscoverRoute || isCalendarRoute || isHomeView;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                title={!isDrawerOpen ? item.label : undefined}
                className={`flex items-center h-12 transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                <span className="w-14 h-12 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>

                {isDrawerOpen && (
                  <div className="flex-1 flex items-center justify-between pr-4 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wide truncate">
                      {item.label}
                    </span>
                    <span className="text-xs ml-2 shrink-0">
                      {isActive ? "●" : ""}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      {isDrawerOpen ? (
        <div className="h-12 px-4 border-t-2 border-black bg-neutral-100 text-[10px] uppercase font-bold tracking-wider text-neutral-600 flex items-center justify-between">
          <span>KO-AX TRACKER</span>
          <span className="font-mono text-[9px] text-neutral-400">v0.1</span>
        </div>
      ) : (
        <div className="h-12 border-t-2 border-black bg-neutral-100 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-black" title="KO-AX Media Tracker" />
        </div>
      )}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleNavClick() {
    setIsDrawerOpen(false);
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-black flex flex-col">
        {/* =================================================================
            TOP HEADER
            Contains: Logo, Global Search, and User Menu.
           ================================================================= */}
        <header className="border-b-2 border-black bg-white sticky top-0 z-40 h-14">
          <div className="flex items-center justify-between gap-2 px-3 h-full">
            {/* Left: Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/"
                className="bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-100"
              >
                <span className="font-extrabold tracking-widest text-xs sm:text-sm">
                  KO
                </span>
                <KoaxLogo className="w-7 h-4 sm:w-8 sm:h-5 text-black shrink-0" />
                <span className="font-extrabold tracking-widest text-xs sm:text-sm">
                  AX
                </span>
              </Link>
            </div>

            {/* Center: Global Search Form */}
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
                className="border-2 border-black px-2.5 py-1.5 text-xs font-bold uppercase bg-white hover:bg-neutral-200 cursor-pointer flex items-center gap-2"
              >
                <span className="inline-block w-2.5 h-2.5 border border-black bg-neutral-400" />
                <span>USER MENU {isUserMenuOpen ? "▴" : "▾"}</span>
              </button>

              {isUserMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-56 border-2 border-black bg-white z-50 divide-y-2 divide-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
            MAIN SHELL (Permanent 56px Rail + Overlay Slide-Over Drawer)
           ================================================================= */}
        <div className="flex-1 flex min-h-0">
          {/* Static Spacer in document flow: Reserves fixed 56px so main content NEVER reflows */}
          <div className="w-14 shrink-0 bg-white select-none pointer-events-none" />

          {/* Fixed Navigation Rail / Drawer: Pinned to viewport, NEVER scrolls away */}
          <aside
            id="koax-sidebar"
            className={`fixed top-14 bottom-0 left-0 bg-white border-r-2 border-black z-30 transition-all duration-150 ease-out ${
              isDrawerOpen
                ? "w-60 shadow-[6px_0px_0px_0px_rgba(0,0,0,1)]"
                : "w-14 shadow-none"
            }`}
          >
            <Suspense
              fallback={
                <div className="p-3 text-xs uppercase font-bold">...</div>
              }
            >
              <SidebarNavigation
                isDrawerOpen={isDrawerOpen}
                onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
                onNavigate={handleNavClick}
              />
            </Suspense>
          </aside>

          {/* Backdrop Overlay when drawer is expanded */}
          {isDrawerOpen && (
            <div
              className="fixed top-14 inset-x-0 bottom-0 bg-black/25 z-20 transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation"
            />
          )}

          {/* Main Viewing Content Area: Permanently fixed width, zero card squish */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

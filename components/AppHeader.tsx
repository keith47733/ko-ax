"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import {
  getOperatorSessionAction,
  logoutAction,
  deleteAccountAction,
} from "@/app/actions/auth";
import {
  BookmarkIcon,
  CalendarIcon,
  CheckCircleIcon,
  CompassIcon,
  EyeIcon,
  LibraryIcon,
} from "@/components/Icons";
import { NavItem } from "@/types";

const NAV_ITEMS: NavItem[] = [
  {
    id: "library",
    label: "Library",
    tooltip: "Media Library (All Tracked Media)",
    href: "/?view=library",
    viewParam: "library",
    icon: LibraryIcon,
  },
  {
    id: "want_to_watch",
    label: "Want",
    tooltip: "Want to Watch",
    href: "/?view=want_to_watch",
    viewParam: "want_to_watch",
    icon: BookmarkIcon,
  },
  {
    id: "watching",
    label: "Watching",
    tooltip: "Currently Watching",
    href: "/?view=watching",
    viewParam: "watching",
    icon: EyeIcon,
  },
  {
    id: "watched",
    label: "Watched",
    tooltip: "Watched",
    href: "/?view=watched",
    viewParam: "watched",
    icon: CheckCircleIcon,
  },
  {
    id: "discover",
    label: "Discover",
    tooltip: "What to Watch Next",
    href: "/discover",
    viewParam: "discover",
    icon: CompassIcon,
  },
  {
    id: "calendar",
    label: "Upcoming",
    tooltip: "Upcoming Releases (Radar)",
    href: "/calendar",
    viewParam: "calendar",
    icon: CalendarIcon,
  },
];

function HeaderViewsNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");

  return (
    <nav
      aria-label="Primary Navigation Views"
      className="flex items-center gap-1 p-1 bg-[#F4F3F0] rounded-2xl shrink-0"
    >
      {NAV_ITEMS.map((item) => {
        const isDiscoverRoute =
          pathname.startsWith("/discover") && item.id === "discover";
        const isCalendarRoute =
          (pathname === "/calendar" ||
            (pathname === "/" && currentView === "calendar")) &&
          item.id === "calendar";
        const isLibraryActive =
          pathname === "/" &&
          (currentView === "library" ||
            (!currentView && item.id === "library"));
        const isHomeView =
          pathname === "/" && currentView === item.viewParam;
        const isActive =
          item.id === "library"
            ? isLibraryActive
            : isDiscoverRoute || isCalendarRoute || isHomeView;

        const Icon = item.icon;
        const activeClasses =
          "bg-zinc-800 text-white font-bold shadow-sm rounded-xl";

        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.tooltip}
            className={`flex flex-col items-center justify-center px-3 sm:px-3.5 h-10 transition-all group cursor-pointer shrink-0 rounded-xl ${
              isActive
                ? activeClasses
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 font-medium"
            }`}
          >
            <div className="flex items-center gap-1">
              <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase leading-none mt-1 select-none whitespace-nowrap font-bold">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [operator, setOperator] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync operator session whenever pathname changes
  useEffect(() => {
    async function fetchOperator() {
      const res = await getOperatorSessionAction();
      if (res.success && res.user?.email) {
        setOperator(res.user.email);
      } else {
        setOperator(null);
      }
    }
    fetchOperator();
  }, [pathname]);

  async function handleLogout() {
    await logoutAction();
    setOperator(null);
    setIsUserMenuOpen(false);
    router.push("/auth");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim() !== "DELETE") return;
    setIsDeleting(true);
    await deleteAccountAction();
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    setOperator(null);
    setIsUserMenuOpen(false);
    setDeleteConfirmText("");
    router.push("/auth");
    router.refresh();
  }

  // Close user menu on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUserMenuOpen]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  if (pathname === "/auth") {
    return null;
  }

  return (
    <>
      {/* =================================================================
          TOP HEADER (LOGO — VIEWS — SEARCH — USER)
         ================================================================= */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-16 shadow-[0_2px_15px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-3 sm:gap-4 md:gap-6 h-full px-3 sm:px-6">
          {/* 1. LOGO (anchored left) */}
          <div className="h-full flex items-center justify-center shrink-0">
            <Link
              href="/"
              className="flex items-center justify-center select-none"
              title="Kura | Personal Media Storehouse"
            >
              <Logo />
            </Link>
          </div>

          {/* 2. VIEWS (Header Navigation) */}
          <HeaderViewsNavigation />

          {/* 3. SEARCH */}
          <div className="flex items-center justify-center shrink min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="w-48 sm:w-60 md:w-72 lg:w-80 flex h-10.5 sm:h-11 bg-white rounded-2xl shadow-[0_4px_16px_rgb(0,0,0,0.06)] overflow-hidden focus-within:ring-2 focus-within:ring-zinc-950/20 ring-1 ring-zinc-300 transition-all"
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
                placeholder="SEARCH MOVIES & TV..."
                className="w-full h-full px-3 sm:px-4 text-xs sm:text-sm font-sans font-medium bg-transparent text-zinc-950 placeholder:text-zinc-400 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="px-4 sm:px-6 h-full text-xs sm:text-sm font-mono font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-white border-none cursor-pointer shrink-0 flex items-center justify-center transition-all active:scale-95"
              >
                GO
              </button>
            </form>
          </div>

          {/* 4. USER (anchored right) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="h-10.5 sm:h-11 rounded-2xl px-4 text-xs sm:text-sm font-mono font-medium uppercase bg-white hover:bg-[#F4F3F0] text-zinc-800 cursor-pointer flex items-center gap-2.5 shadow-[0_4px_16px_rgb(0,0,0,0.06)] ring-1 ring-zinc-300 transition-all"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  operator ? "bg-[#34D399] shadow-sm shadow-emerald-500/50" : "bg-zinc-300"
                }`}
              />
              <span className="font-mono text-xs sm:text-[13px] font-black truncate max-w-28 sm:max-w-36">
                {operator ? operator.split("@")[0].toUpperCase() : "OPERATOR"}
              </span>
              <span className="text-zinc-600 font-bold">{isUserMenuOpen ? "▴" : "▾"}</span>
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white z-50 divide-y divide-zinc-200 text-xs shadow-2xl ring-1 ring-black/10 overflow-hidden"
              >
                {operator ? (
                  <>
                    <div className="px-4 py-3 font-mono text-[11px] text-zinc-700 font-bold break-all normal-case bg-[#F4F3F0]">
                      {operator}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 font-sans font-bold text-xs uppercase text-zinc-950 hover:bg-[#F4F3F0] cursor-pointer transition-colors"
                    >
                      SIGN OUT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 font-sans font-bold text-xs uppercase text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      DELETE USER
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-3.5 font-sans font-black bg-[#FF7A50] text-zinc-950 hover:brightness-95 transition-colors"
                  >
                    ➔ OPERATOR SIGN IN / SIGN UP
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 bg-zinc-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="max-w-md w-full rounded-2xl bg-white shadow-2xl overflow-hidden ring-1 ring-black/10">
            <div className="bg-zinc-800 text-white px-5 py-3.5 flex items-center justify-between">
              <span
                id="delete-modal-title"
                className="font-sans tracking-tight text-sm sm:text-base text-red-300 font-semibold"
              >
                CRITICAL: PURGE OPERATOR ACCOUNT
              </span>
              <span className="font-mono text-[10px] uppercase border border-red-400 text-red-300 px-1.5 py-0.5 rounded">
                IRREVERSIBLE
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans text-zinc-600">
              <p className="leading-relaxed normal-case">
                Warning: Deleting your operator account will permanently wipe
                your identity, tracked watchlists, episode history, and
                ratings from the database.
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="delete-confirm-input"
                  className="block font-mono font-medium text-[11px] text-zinc-700"
                >
                  TYPE &quot;DELETE&quot; TO CONFIRM PURGE:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl p-2.5 font-mono uppercase text-xs bg-[#F4F3F0] text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                  }}
                  className="h-10 rounded-xl bg-[#F4F3F0] text-zinc-700 font-medium uppercase hover:bg-zinc-200 cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteConfirmText.trim() !== "DELETE" || isDeleting
                  }
                  className={`h-10 rounded-xl font-medium uppercase transition-all ${
                    deleteConfirmText.trim() === "DELETE" && !isDeleting
                      ? "bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-sm"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  {isDeleting ? "PURGING..." : "PURGE ACCOUNT"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import KoaxLogo from "@/components/Logo";
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

interface NavItem {
  id: string;
  label: string;
  tooltip: string;
  href: string;
  viewParam: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

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
    tooltip: "Watched & Rated",
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
      className="flex items-stretch h-full border-r border-stone-300 divide-x divide-stone-300 overflow-x-auto no-scrollbar shrink-0"
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
          "bg-stone-800 text-white font-medium";

        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.tooltip}
            className={`flex flex-col items-center justify-center px-2.5 sm:px-3.5 h-full transition-colors group cursor-pointer shrink-0 ${
              isActive
                ? activeClasses
                : "bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-mono tracking-wider uppercase leading-none mt-1 select-none whitespace-nowrap">
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
      <header className="border-b border-stone-300 bg-stone-50/90 backdrop-blur-md sticky top-0 z-40 h-16">
        <div className="flex items-center justify-between h-full pr-3 sm:pr-6">
          {/* Left Group: Logo + Views Navigation flush together (no gap/padding) */}
          <div className="flex items-stretch h-full shrink-0">
            {/* 1. LOGO */}
            <div className="w-auto px-4 lg:w-84 lg:px-0 border-r border-stone-300 h-full flex items-center justify-center shrink-0">
              <Link
                href="/"
                className="flex items-center justify-center font-serif tracking-tight text-2xl sm:text-3xl lg:text-3xl leading-none text-stone-900 font-bold select-none"
                title="KO-AX Personal Media Engine"
              >
                <span>KO</span>
                <KoaxLogo className="h-4 sm:h-5 w-auto text-stone-900 shrink-0 mx-1 sm:mx-1.5" />
                <span>AX</span>
              </Link>
            </div>

            {/* 2. VIEWS (Header Navigation) */}
            <HeaderViewsNavigation />
          </div>

          {/* 3. SEARCH */}
          <div className="flex-1 flex items-center justify-center px-3 sm:px-6 min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="w-full max-w-xs md:max-w-sm lg:max-w-md flex h-10 sm:h-10.5 border border-stone-300 bg-stone-50 rounded-md shadow-sm overflow-hidden"
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
                className="w-full h-full px-3 text-xs sm:text-sm font-sans bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              <button
                type="submit"
                className="border-l border-stone-300 px-3.5 sm:px-4 h-full text-xs font-mono font-medium uppercase bg-stone-200 text-stone-800 hover:bg-stone-300 cursor-pointer shrink-0 flex items-center justify-center transition-colors"
              >
                GO
              </button>
            </form>
          </div>

          {/* 4. USER */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="h-10 sm:h-10.5 border border-stone-300 rounded-md px-3 text-xs sm:text-sm font-mono font-medium uppercase bg-stone-50 hover:bg-stone-100 text-stone-800 cursor-pointer flex items-center gap-2.5 shadow-sm transition-colors"
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  operator ? "bg-emerald-700" : "bg-stone-300"
                }`}
              />
              <span className="font-mono text-xs sm:text-[13px] truncate max-w-28 sm:max-w-36">
                {operator ? operator.split("@")[0].toUpperCase() : "OPERATOR"}
              </span>
              <span className="text-stone-400">{isUserMenuOpen ? "▴" : "▾"}</span>
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-56 sm:w-60 border border-stone-300 rounded-md bg-stone-50 z-50 divide-y divide-stone-200 text-xs shadow-md shadow-stone-800/10 overflow-hidden"
              >
                {operator ? (
                  <>
                    <div className="px-3.5 py-2 font-mono text-[11px] text-stone-600 break-all normal-case bg-stone-100/60">
                      {operator}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2.5 font-sans font-medium text-xs uppercase text-stone-800 hover:bg-stone-100 cursor-pointer transition-colors"
                    >
                      SIGN OUT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 font-sans font-medium text-xs uppercase text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      DELETE USER
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-3.5 py-2.5 font-sans font-medium bg-orange-700 text-white hover:bg-orange-800 transition-colors"
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
          className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="max-w-md w-full border border-stone-300 rounded-md bg-stone-50 shadow-lg shadow-stone-900/20 overflow-hidden">
            <div className="border-b border-stone-300 bg-stone-900 text-stone-100 px-4 py-3 flex items-center justify-between">
              <span
                id="delete-modal-title"
                className="font-serif tracking-tight text-sm sm:text-base text-red-300 font-semibold"
              >
                CRITICAL: PURGE OPERATOR ACCOUNT
              </span>
              <span className="font-mono text-[10px] uppercase border border-red-400 text-red-300 px-1.5 py-0.5 rounded">
                IRREVERSIBLE
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans text-stone-700">
              <p className="leading-relaxed normal-case">
                Warning: Deleting your operator account will permanently wipe
                your identity, tracked watchlists, episode history, and
                ratings from the database.
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="delete-confirm-input"
                  className="block font-mono font-medium text-[11px] text-stone-700"
                >
                  TYPE &quot;DELETE&quot; TO CONFIRM PURGE:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border border-stone-300 rounded-md p-2 font-mono uppercase text-xs bg-stone-50 text-stone-900 focus:outline-none focus:border-stone-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                  }}
                  className="h-10 border border-stone-300 rounded-md bg-stone-50 text-stone-700 font-medium uppercase hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteConfirmText.trim() !== "DELETE" || isDeleting
                  }
                  className={`h-10 border rounded-md font-medium uppercase transition-all ${
                    deleteConfirmText.trim() === "DELETE" && !isDeleting
                      ? "bg-red-700 text-white hover:bg-red-800 border-red-700 cursor-pointer shadow-sm"
                      : "bg-stone-200 text-stone-400 border-stone-200 cursor-not-allowed"
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


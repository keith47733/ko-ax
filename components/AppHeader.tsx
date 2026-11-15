"use client";

import {
  deleteAccountAction,
  getUserSessionAction,
  logoutAction,
} from "@/app/actions/auth";
import {
  getUserPreferencesAction,
  setUserPreferenceAction,
} from "@/app/actions/media";
import {
  BookmarkIcon,
  CalendarIcon,
  CheckCircleIcon,
  CompassIcon,
  EyeIcon,
  LibraryIcon,
  SearchIcon,
} from "@/components/Icons";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import { NavItem } from "@/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const NAV_ITEMS: NavItem[] = [
  {
    id: "search",
    label: "Search",
    tooltip: "Search Movies & TV Shows",
    href: "/search",
    viewParam: "search",
    icon: SearchIcon,
  },
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
      className="flex shrink-0 items-center gap-1 rounded-2xl bg-canvas p-1"
    >
      {NAV_ITEMS.map((item) => {
        const isSearchRoute =
          pathname.startsWith("/search") && item.id === "search";
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
        const isHomeView = pathname === "/" && currentView === item.viewParam;
        const isActive =
          item.id === "search"
            ? isSearchRoute
            : item.id === "library"
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
            onClick={() => {
              if (item.id === "search") {
                setTimeout(() => {
                  document.getElementById("global-search-input")?.focus();
                }, 50);
              }
            }}
            className={`group flex h-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl px-3 transition-all sm:px-3.5 ${
              isActive
                ? activeClasses
                : "font-medium text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900"
            }`}
          >
            <div className="flex items-center gap-1">
              <Icon className="h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5" />
            </div>
            <span className="mt-1 font-mono text-[10px] leading-none font-bold tracking-wider whitespace-nowrap uppercase select-none sm:text-[11px]">
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
  const searchParams = useSearchParams();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [includeAdult, setIncludeAdult] = useState(false);
  const [englishOnly, setEnglishOnly] = useState(false);

  // Sync user content preferences on mount
  useEffect(() => {
    async function loadPrefs() {
      const prefs = await getUserPreferencesAction();
      setIncludeAdult(prefs.includeAdult);
      setEnglishOnly(prefs.englishOnly);
    }
    loadPrefs();
  }, []);

  async function handleToggleAdult() {
    const nextVal = !includeAdult;
    setIncludeAdult(nextVal);
    await setUserPreferenceAction({ includeAdult: nextVal });
    router.refresh();
  }

  async function handleToggleEnglishOnly() {
    const nextVal = !englishOnly;
    setEnglishOnly(nextVal);
    await setUserPreferenceAction({ englishOnly: nextVal });
    router.refresh();
  }

  // Sync user session whenever pathname changes
  useEffect(() => {
    async function fetchUser() {
      const res = await getUserSessionAction();
      if (res.success && res.user?.email) {
        setUser(res.user.email);
      } else {
        setUser(null);
      }
    }
    fetchUser();
  }, [pathname]);

  async function handleLogout() {
    await logoutAction();
    setUser(null);
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
    setUser(null);
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

  if (pathname === "/auth") {
    return null;
  }

  return (
    <>
      {/* =================================================================
          TOP STICKY HEADER (LOGO — VIEWS — USER + SUB-HEADER SEARCH)
         ================================================================= */}
      <header className="sticky top-0 z-40 bg-white/80 shadow-xs backdrop-blur-md">
        {/* Row 1: Logo, Views, User */}
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:gap-4 sm:px-6 md:gap-6">
          {/* 1. LOGO (anchored left) */}
          <div className="flex h-full shrink-0 items-center justify-center">
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

          {/* 3. USER (anchored right) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="flex h-10.5 cursor-pointer items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 font-mono text-xs font-medium text-zinc-800 uppercase shadow-[0_4px_16px_rgb(0,0,0,0.06)] transition-all hover:bg-canvas sm:h-11 sm:text-sm"
            >
              <span className="max-w-28 truncate font-mono text-xs font-black sm:max-w-36 sm:text-[13px]">
                {user ? user.split("@")[0].toUpperCase() : "USER"}
              </span>
              <span className="font-bold text-zinc-600">
                {isUserMenuOpen ? "▴" : "▾"}
              </span>
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-64 divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white text-xs shadow-2xl ring-1 ring-black/10 sm:w-72"
              >
                {user ? (
                  <div className="bg-canvas px-4 py-3 font-mono text-[11px] font-bold break-all text-zinc-700 normal-case">
                    {user}
                  </div>
                ) : null}

                {/* Content Preferences Section */}
                <div className="space-y-3 p-3.5 bg-canvas/70">
                  <span className="block font-mono text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    CONTENT PREFERENCES
                  </span>

                  {/* 18+ Adult Content Toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-sans text-xs font-bold text-zinc-950">
                        18+ Adult Content
                      </span>
                      <span className="font-sans text-[10px] text-zinc-500">
                        Include adult titles in search &amp; discover
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={includeAdult}
                      onClick={handleToggleAdult}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        includeAdult ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          includeAdult ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* English Titles Only Toggle */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200/70">
                    <div className="flex flex-col">
                      <span className="font-sans text-xs font-bold text-zinc-950">
                        English Only
                      </span>
                      <span className="font-sans text-[10px] text-zinc-500">
                        Exclude subtitles / foreign audio
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={englishOnly}
                      onClick={handleToggleEnglishOnly}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        englishOnly ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          englishOnly ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full cursor-pointer px-4 py-3 text-left font-sans text-xs font-bold text-zinc-950 uppercase transition-colors hover:bg-canvas"
                    >
                      SIGN OUT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full cursor-pointer px-4 py-3 text-left font-sans text-xs font-bold text-red-600 uppercase transition-colors hover:bg-red-50"
                    >
                      DELETE USER
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="btn-beeswax-gradient block bg-gradient-to-r from-[#f0d574] via-[#e2b73e] to-[#cca028] px-4 py-3.5 font-sans font-black text-zinc-950 shadow-xs transition-all hover:from-[#f5dc86] hover:via-[#e8c04c] hover:to-[#d4aa32]"
                  >
                    ➔ USER SIGN IN / SIGN UP
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: GLASSY SUB-HEADER WITH CENTERED SEARCH BAR & DROP SHADOW (hidden on /media/[id]) */}
        {!pathname.startsWith("/media/") && (
          <div className="flex h-11 items-center border-t border-t-zinc-200/80 border-b border-b-zinc-300/80 bg-canvas/90 shadow-xs shadow-black/5 backdrop-blur-md">
            <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 sm:px-6">
              <SearchBar
                key={searchParams.get("q") ?? ""}
                defaultValue={searchParams.get("q") ?? ""}
                className="max-w-md sm:max-w-lg"
              />
            </div>
          </div>
        )}
      </header>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center justify-between bg-zinc-800 px-5 py-3.5 text-white">
              <span
                id="delete-modal-title"
                className="font-sans text-sm font-semibold tracking-tight text-red-300 sm:text-base"
              >
                CRITICAL: PURGE USER ACCOUNT
              </span>
              <span className="rounded border border-red-400 px-1.5 py-0.5 font-mono text-[10px] text-red-300 uppercase">
                IRREVERSIBLE
              </span>
            </div>

            <div className="space-y-4 p-5 font-sans text-xs text-zinc-600">
              <p className="leading-relaxed normal-case">
                Warning: Deleting your user account will permanently wipe
                your identity, tracked watchlists, episode history, and ratings
                from the database.
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="delete-confirm-input"
                  className="block font-mono text-[11px] font-medium text-zinc-700"
                >
                  TYPE &quot;DELETE&quot; TO CONFIRM PURGE:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl bg-canvas p-2.5 font-mono text-xs text-zinc-800 uppercase focus:ring-2 focus:ring-zinc-800/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                  }}
                  className="h-10 cursor-pointer rounded-xl border border-zinc-300 bg-canvas font-medium text-zinc-700 uppercase transition-colors hover:bg-zinc-200"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                  className={`h-10 rounded-xl font-medium uppercase transition-all ${
                    deleteConfirmText.trim() === "DELETE" && !isDeleting
                      ? "cursor-pointer border border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700"
                      : "cursor-not-allowed border border-zinc-300/80 bg-zinc-200 text-zinc-400"
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

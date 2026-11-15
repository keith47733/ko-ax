"use client";

import React, { useCallback, useSyncExternalStore } from "react";
import { GridIcon, ListIcon } from "@/components/Icons";
import { DisplayLayoutMode, ViewModeToggleProps } from "@/types";

const STORAGE_KEY = "kura_view_mode";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): DisplayLayoutMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function getServerSnapshot(): DisplayLayoutMode {
  return "grid";
}

/**
 * Hook to share and synchronize grid/list layout preference across components
 * without triggering React cascading render warnings.
 */
export function useViewMode(): [
  DisplayLayoutMode,
  (mode: DisplayLayoutMode) => void,
] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((newMode: DisplayLayoutMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignore in private/restricted mode
    }
  }, []);

  return [mode, setMode];
}

export default function ViewModeToggle({
  viewMode,
  onChange,
  className = "",
}: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="View layout mode"
      className={`flex items-center gap-1 rounded-xl border border-zinc-200/90 bg-[#F4F3F0] p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        title="Switch to Grid View"
        aria-pressed={viewMode === "grid"}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-all ${
          viewMode === "grid"
            ? "bg-white text-zinc-950 shadow-xs"
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <GridIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">GRID</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        title="Switch to List View"
        aria-pressed={viewMode === "list"}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition-all ${
          viewMode === "list"
            ? "bg-white text-zinc-950 shadow-xs"
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <ListIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">LIST</span>
      </button>
    </div>
  );
}

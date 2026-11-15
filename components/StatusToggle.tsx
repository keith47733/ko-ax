"use client";

import { BookmarkIcon, CheckCircleIcon, EyeIcon } from "@/components/Icons";
import {
  MediaStatus,
  MediaType,
  StatusOption,
  StatusPopupButtonProps,
  StatusToggleGroupProps,
} from "@/types";
import React, { useEffect, useRef, useState } from "react";

export type { StatusOption, StatusPopupButtonProps, StatusToggleGroupProps };

export const STATUS_DEFINITIONS: StatusOption[] = [
  {
    value: "want_to_watch",
    shortLabel: "WANT",
    fullLabel: "WANT",
    accentBg: "bg-coral",
    activeHoverBg: "hover:bg-[#ffa080]",
    activeHoverClass: "btn-status-want",
    inactiveDarkHoverClass: "btn-status-want-inactive",
    textColor: "text-zinc-950 font-black",
    activeRing: "ring-orange-500/30",
    shadowColor: "shadow-orange-500/25",
    lightHoverBg:
      "hover:bg-orange-100 hover:text-orange-950 hover:border-coral",
    darkHoverBg:
      "hover:bg-zinc-600 hover:border-coral hover:text-white",
    Icon: BookmarkIcon,
  },
  {
    value: "watching",
    shortLabel: "WATCHING",
    fullLabel: "WATCHING",
    accentBg: "bg-periwinkle",
    activeHoverBg: "hover:bg-[#a5b4fc]",
    activeHoverClass: "btn-status-watching",
    inactiveDarkHoverClass: "btn-status-watching-inactive",
    textColor: "text-indigo-950 font-black",
    activeRing: "ring-indigo-500/30",
    shadowColor: "shadow-indigo-500/25",
    lightHoverBg:
      "hover:bg-indigo-100 hover:text-indigo-950 hover:border-periwinkle",
    darkHoverBg:
      "hover:bg-zinc-600 hover:border-periwinkle hover:text-white",
    Icon: EyeIcon,
  },
  {
    value: "watched",
    shortLabel: "WATCHED",
    fullLabel: "WATCHED",
    accentBg: "bg-mint",
    activeHoverBg: "hover:bg-[#6ee7b7]",
    activeHoverClass: "btn-status-watched",
    inactiveDarkHoverClass: "btn-status-watched-inactive",
    textColor: "text-emerald-950 font-black",
    activeRing: "ring-emerald-500/30",
    shadowColor: "shadow-emerald-500/25",
    lightHoverBg:
      "hover:bg-emerald-100 hover:text-emerald-950 hover:border-mint",
    darkHoverBg:
      "hover:bg-zinc-600 hover:border-mint hover:text-white",
    Icon: CheckCircleIcon,
  },
];

/**
 * Inline 3-button status toggle group for Detail Views and consoles.
 * Pure Japandi aesthetic: high-chroma pastel highlights against #F4F3F0 track and white cards.
 */
export function StatusToggleGroup({
  status,
  mediaType = "movie",
  onChange,
  disabled = false,
  className = "",
  theme = "dark",
  boxed = true,
}: {
  status: MediaStatus | null;
  mediaType?: MediaType;
  onChange: (nextStatus: MediaStatus) => void;
  disabled?: boolean;
  className?: string;
  theme?: "light" | "dark";
  boxed?: boolean;
}) {
  const isDark = theme === "dark";

  const containerClasses = boxed
    ? `grid grid-cols-3 gap-2.5 rounded-2xl ${
        isDark
          ? "border border-zinc-700/80 bg-zinc-900/80 backdrop-blur-md"
          : "bg-canvas"
      } p-1.5 sm:gap-3 ${className}`
    : `grid grid-cols-3 gap-2 sm:gap-2.5 ${className}`;

  const buttonPaddingAndText = boxed
    ? "py-3.5 px-3 text-xs sm:text-sm font-mono font-bold"
    : "py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-[13px] font-mono font-bold";

  return (
    <div
      role="group"
      aria-label="Media Watch Status"
      className={containerClasses}
    >
      {STATUS_DEFINITIONS.map((opt) => {
        const isActive = status === opt.value;
        const isWatchingMovie =
          mediaType === "movie" && opt.value === "watching";
        const isOptionDisabled = disabled || isWatchingMovie;

        let style = isDark
          ? `border border-zinc-600 bg-zinc-700/90 text-white ${opt.darkHoverBg} ${opt.inactiveDarkHoverClass} rounded-xl ${buttonPaddingAndText} uppercase tracking-wider transition-all duration-150 shadow-xs hover:scale-[1.02]`
          : `border border-zinc-200/90 bg-white text-zinc-800 ${opt.lightHoverBg} rounded-xl ${buttonPaddingAndText} uppercase tracking-wider transition-all duration-150 shadow-xs hover:scale-[1.02]`;

        if (isOptionDisabled) {
          style = isDark
            ? `border border-zinc-800/40 bg-zinc-900/40 text-zinc-600 line-through cursor-not-allowed rounded-xl ${buttonPaddingAndText} uppercase opacity-40 select-none`
            : `bg-canvas/60 text-zinc-400 line-through cursor-not-allowed rounded-xl ${buttonPaddingAndText} uppercase opacity-40 select-none`;
        } else if (isActive) {
          style = `${opt.accentBg} ${opt.textColor} font-mono font-black rounded-xl ${buttonPaddingAndText} uppercase tracking-wider shadow-lg ${opt.shadowColor} border ${isDark ? "border-white/70" : "border-zinc-900/15"} ${opt.activeHoverBg} ${opt.activeHoverClass} hover:scale-[1.03] transition-all duration-150`;
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !isOptionDisabled && onChange(opt.value)}
            disabled={isOptionDisabled}
            className={`flex cursor-pointer items-center justify-center text-center transition-all active:scale-95 ${style}`}
          >
            {opt.fullLabel}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Standardized HUD status button and popover chip selector (for MediaCard).
 */
export function StatusPopupButton({
  status,
  mediaType = "movie",
  onSelect,
  disabled = false,
  title,
}: {
  status: MediaStatus | null;
  mediaType?: MediaType;
  onSelect: (nextStatus: MediaStatus) => void;
  disabled?: boolean;
  title?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeDef = STATUS_DEFINITIONS.find((d) => d.value === status);
  const StatusIcon = activeDef ? activeDef.Icon : BookmarkIcon;

  let buttonClasses =
    "bg-white/85 text-zinc-800 btn-hud-light hover:text-zinc-950 hover:bg-white hover:border-zinc-400 hover:scale-105 shadow-md border border-white/90 transition-all duration-150";

  if (activeDef) {
    buttonClasses = `${activeDef.accentBg} ${activeDef.textColor} shadow-lg ${activeDef.shadowColor} border border-white/90 ${activeDef.activeHoverBg} ${activeDef.activeHoverClass} hover:scale-105 hover:border-white transition-all duration-150`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        title={
          title ||
          `Status: ${activeDef?.fullLabel || "Untracked"} • Click to modify`
        }
        className={`flex h-8 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg backdrop-blur-md transition-all active:scale-95 ${buttonClasses}`}
      >
        <StatusIcon className="h-4 w-4 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-25 cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-9.5 right-0 z-30 w-60 space-y-2 rounded-2xl bg-white p-2.5 text-zinc-950 shadow-2xl ring-2 ring-black/10 select-text"
          >
            <div className="flex w-full items-center justify-between border-b border-zinc-200 pb-1.5">
              <span className="font-mono text-xs font-bold tracking-wider text-zinc-800 uppercase">
                STATUS
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="cursor-pointer p-0 font-mono text-sm leading-none font-bold text-zinc-400 hover:text-zinc-950"
                title="Close without changing"
              >
                ✕
              </button>
            </div>

            <div className="grid w-full grid-cols-3 gap-1.5">
              {STATUS_DEFINITIONS.map((opt) => {
                const isActive = status === opt.value;
                const isOptionDisabled =
                  mediaType === "movie" && opt.value === "watching";

                let chipStyle = `border border-zinc-200/90 bg-canvas text-zinc-800 ${opt.lightHoverBg} rounded-xl font-bold transition-all duration-150 hover:scale-[1.02]`;

                if (isOptionDisabled) {
                  chipStyle =
                    "border border-transparent bg-canvas/60 text-zinc-400 line-through cursor-not-allowed rounded-xl opacity-40 select-none";
                } else if (isActive) {
                  chipStyle = `${opt.accentBg} ${opt.textColor} rounded-xl shadow-md border ${
                    opt.value === "want_to_watch"
                      ? "border-orange-500/50"
                      : opt.value === "watching"
                        ? "border-indigo-500/50"
                        : "border-emerald-500/50"
                  } ${opt.activeHoverBg} ${opt.activeHoverClass} hover:scale-[1.02] transition-all duration-150`;
                }

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (!isOptionDisabled) {
                        onSelect(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    disabled={disabled || isOptionDisabled}
                    className={`flex h-8 cursor-pointer items-center justify-center truncate px-1 font-mono text-xs uppercase transition-all ${chipStyle}`}
                  >
                    {opt.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

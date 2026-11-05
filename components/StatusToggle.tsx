"use client";

import React, { useEffect, useRef, useState } from "react";
import { BookmarkIcon, CheckCircleIcon, EyeIcon } from "@/components/Icons";
import { MediaStatus, MediaType } from "@/types";

export interface StatusOption {
  value: MediaStatus;
  shortLabel: string;
  fullLabel: string;
  accentBg: string;
  textColor: string;
  activeRing: string;
  shadowColor: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}

export const STATUS_DEFINITIONS: StatusOption[] = [
  {
    value: "want_to_watch",
    shortLabel: "WANT",
    fullLabel: "WANT TO WATCH",
    accentBg: "bg-[#FF7A50]",
    textColor: "text-zinc-950 font-black",
    activeRing: "ring-orange-500/30",
    shadowColor: "shadow-orange-500/25",
    Icon: BookmarkIcon,
  },
  {
    value: "watching",
    shortLabel: "WATCHING",
    fullLabel: "WATCHING",
    accentBg: "bg-[#818CF8]",
    textColor: "text-indigo-950 font-black",
    activeRing: "ring-indigo-500/30",
    shadowColor: "shadow-indigo-500/25",
    Icon: EyeIcon,
  },
  {
    value: "watched",
    shortLabel: "WATCHED",
    fullLabel: "WATCHED",
    accentBg: "bg-[#34D399]",
    textColor: "text-emerald-950 font-black",
    activeRing: "ring-emerald-500/30",
    shadowColor: "shadow-emerald-500/25",
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
}: {
  status: MediaStatus | null;
  mediaType?: MediaType;
  onChange: (nextStatus: MediaStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Media Watch Status"
      className={`grid grid-cols-3 gap-2.5 sm:gap-3 p-1.5 bg-[#F4F3F0] rounded-2xl ${className}`}
    >
      {STATUS_DEFINITIONS.map((opt) => {
        const isActive = status === opt.value;
        const isWatchingMovie =
          mediaType === "movie" && opt.value === "watching";
        const isOptionDisabled = disabled || isWatchingMovie;

        let style =
          "bg-white text-zinc-800 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl py-3.5 px-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider transition-all shadow-xs";

        if (isOptionDisabled) {
          style =
            "bg-[#F4F3F0]/60 text-zinc-400 line-through cursor-not-allowed rounded-xl py-3.5 px-3 text-xs sm:text-sm font-mono font-medium uppercase opacity-40 select-none";
        } else if (isActive) {
          style = `${opt.accentBg} ${opt.textColor} font-mono font-black rounded-xl py-3.5 px-3 text-xs sm:text-sm uppercase tracking-wider shadow-lg ${opt.shadowColor} ring-2 ring-white/70`;
        }

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !isOptionDisabled && onChange(opt.value)}
            disabled={isOptionDisabled}
            className={`flex items-center justify-center cursor-pointer transition-all active:scale-95 ${style}`}
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
    "bg-white/95 text-zinc-800 hover:text-zinc-950 hover:bg-white shadow-md ring-2 ring-white/90";

  if (activeDef) {
    buttonClasses = `${activeDef.accentBg} ${activeDef.textColor} shadow-lg ${activeDef.shadowColor} ring-2 ring-white/90`;
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
        className={`w-16 h-11 rounded-xl flex items-center justify-center cursor-pointer backdrop-blur-md transition-all active:scale-95 shrink-0 ${buttonClasses}`}
      >
        <StatusIcon className="w-5.5 h-5.5 shrink-0" />
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
            className="absolute top-13 right-0 z-30 w-64 rounded-2xl bg-white p-3 shadow-2xl ring-2 ring-black/10 text-zinc-950 select-text space-y-2"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 w-full">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-800">
                STATUS
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-sm font-mono font-bold text-zinc-400 hover:text-zinc-950 cursor-pointer p-0 leading-none"
                title="Close without changing"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-full">
              {STATUS_DEFINITIONS.map((opt) => {
                const isActive = status === opt.value;
                const isOptionDisabled =
                  mediaType === "movie" && opt.value === "watching";

                let chipStyle =
                  "bg-[#F4F3F0] text-zinc-800 hover:bg-zinc-200 rounded-xl font-bold transition-all";

                if (isOptionDisabled) {
                  chipStyle =
                    "bg-[#F4F3F0]/60 text-zinc-400 line-through cursor-not-allowed rounded-xl opacity-40";
                } else if (isActive) {
                  chipStyle = `${opt.accentBg} ${opt.textColor} rounded-xl shadow-md ring-2 ${opt.activeRing}`;
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
                    className={`h-9 px-1 text-xs font-mono uppercase flex items-center justify-center truncate cursor-pointer transition-all ${chipStyle}`}
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

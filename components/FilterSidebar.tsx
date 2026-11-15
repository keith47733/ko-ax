"use client";

import React from "react";
import type {
  FilterSearchInputProps,
  FilterSectionProps,
  FilterSidebarHeaderProps,
  FilterSidebarProps,
  SegmentedControlOption,
  SegmentedControlProps,
} from "@/types";

export type {
  FilterSearchInputProps,
  FilterSectionProps,
  FilterSidebarHeaderProps,
  FilterSidebarProps,
  SegmentedControlOption,
  SegmentedControlProps,
};

export function FilterSidebar({
  children,
  className = "",
}: FilterSidebarProps) {
  return (
    <aside
      className={`w-full shrink-0 space-y-4.5 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 lg:w-72 ${className}`}
    >
      {children}
    </aside>
  );
}

export function FilterSidebarHeader({
  title,
  count,
  countBadgeClass = "bg-zinc-200 text-zinc-950",
}: FilterSidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3.5">
      <h2 className="truncate font-sans text-sm font-black tracking-tight text-zinc-950 sm:text-base">
        {title}
      </h2>
      {count !== undefined && (
        <span
          className={`shrink-0 rounded-xl px-2.5 py-0.5 font-mono text-xs font-bold ${countBadgeClass}`}
        >
          [{count}]
        </span>
      )}
    </div>
  );
}

export function FilterSection({
  label,
  children,
  className = "",
}: FilterSectionProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <span className="block font-mono text-sm font-black tracking-wider text-zinc-950 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  inline = false,
  className = "",
}: SegmentedControlProps<T>) {
  const gridClass =
    columns === 1
      ? "grid grid-cols-1"
      : columns === 2
        ? "grid grid-cols-2"
        : columns === 3
          ? "grid grid-cols-3"
          : columns === 4
            ? "grid grid-cols-4"
            : options.length === 1
              ? "grid grid-cols-1"
              : options.length === 2
                ? "grid grid-cols-2"
                : options.length === 3
                  ? "grid grid-cols-3"
                  : options.length === 4
                    ? "grid grid-cols-4"
                    : "grid grid-cols-2";

  const containerClass = inline
    ? `inline-flex p-1 bg-canvas rounded-xl gap-1 text-xs sm:text-sm font-mono uppercase ${className}`
    : `${gridClass} p-1 bg-canvas rounded-xl gap-1 text-xs sm:text-sm font-mono uppercase text-center ${className}`;

  return (
    <div className={containerClass}>
      {options.map((option) => {
        const isActive = value === option.value;
        const activeClass =
          "bg-zinc-800 hover:bg-zinc-700 text-white font-bold shadow-sm";
        const inactiveClass =
          "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 font-medium";

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => !option.disabled && onChange(option.value)}
            disabled={option.disabled}
            className={`cursor-pointer truncate rounded-lg px-2.5 py-2 transition-all ${
              isActive ? activeClass : inactiveClass
            } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterSearchInput({
  className = "",
  placeholder = "TYPE TO FILTER...",
  ...props
}: FilterSearchInputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={`h-11 w-full rounded-xl bg-canvas px-3.5 font-sans text-xs font-medium text-zinc-950 transition-all placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-950/20 focus:outline-none sm:text-sm ${className}`}
      {...props}
    />
  );
}

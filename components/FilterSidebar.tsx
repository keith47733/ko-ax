"use client";

import React from "react";

export interface FilterSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterSidebar({ children, className = "" }: FilterSidebarProps) {
  return (
    <aside
      className={`w-full lg:w-72 shrink-0 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 space-y-4.5 ${className}`}
    >
      {children}
    </aside>
  );
}

export interface FilterSidebarHeaderProps {
  title: string;
  count?: number;
  countBadgeClass?: string;
}

export function FilterSidebarHeader({
  title,
  count,
  countBadgeClass = "bg-zinc-200 text-zinc-950",
}: FilterSidebarHeaderProps) {
  return (
    <div className="border-b border-zinc-200 pb-3.5 flex items-center justify-between gap-2">
      <h2 className="font-sans text-sm sm:text-base font-black text-zinc-950 tracking-tight truncate">
        {title}
      </h2>
      {count !== undefined && (
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-xl shrink-0 ${countBadgeClass}`}
        >
          [{count}]
        </span>
      )}
    </div>
  );
}

export interface FilterSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterSection({
  label,
  children,
  className = "",
}: FilterSectionProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <span className="block text-sm font-mono font-black uppercase text-zinc-950 tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  inline?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  inline = false,
  className = "",
}: SegmentedControlProps<T>) {
  const gridClass = columns
    ? `grid grid-cols-${columns}`
    : options.length <= 4
    ? `grid grid-cols-${options.length}`
    : "grid grid-cols-2";

  const containerClass = inline
    ? `inline-flex p-1 bg-[#F4F3F0] rounded-xl gap-1 text-xs sm:text-sm font-mono uppercase ${className}`
    : `${gridClass} p-1 bg-[#F4F3F0] rounded-xl gap-1 text-xs sm:text-sm font-mono uppercase text-center ${className}`;

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
            className={`py-2 px-2.5 rounded-lg transition-all cursor-pointer truncate ${
              isActive ? activeClass : inactiveClass
            } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface FilterSearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
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
      className={`w-full h-11 rounded-xl px-3.5 bg-[#F4F3F0] text-zinc-950 text-xs sm:text-sm font-sans font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/20 placeholder:text-zinc-400 transition-all ${className}`}
      {...props}
    />
  );
}


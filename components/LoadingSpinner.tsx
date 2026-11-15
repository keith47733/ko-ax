import React from "react";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-5 w-5 border-[2.5px]",
  md: "h-8 w-8 border-[3px]",
  lg: "h-10 w-10 border-[3.5px]",
  xl: "h-12 w-12 border-4",
};

export default function LoadingSpinner({
  size = "md",
  className = "",
  ariaLabel = "Loading",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center"
    >
      <div
        className={`animate-spin rounded-full border-zinc-800/20 border-t-zinc-800 ${SIZE_CLASSES[size]} ${className}`}
      />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}


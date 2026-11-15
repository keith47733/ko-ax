"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBarProps } from "@/types";

export default function SearchBar({
  defaultValue = "",
  value,
  onChange,
  onSubmit,
  placeholder = "SEARCH MOVIES & TV SHOWS...",
  className = "",
  inputClassName = "",
  buttonClassName = "",
  id = "global-search-input",
}: SearchBarProps) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentQuery = isControlled ? value : internalQuery;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextVal = e.target.value;
    if (!isControlled) {
      setInternalQuery(nextVal);
    }
    onChange?.(nextVal);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = currentQuery.trim();
    if (onSubmit) {
      onSubmit(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`flex h-8 w-full overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-zinc-300 transition-all focus-within:ring-2 focus-within:ring-zinc-950/20 ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <input
        id={id}
        type="search"
        name="q"
        value={currentQuery}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`h-full w-full min-w-0 bg-transparent px-3.5 font-sans text-xs font-medium text-zinc-950 placeholder:text-zinc-400 focus:outline-none ${inputClassName}`}
      />
      <button
        type="submit"
        className={`flex h-full shrink-0 cursor-pointer items-center justify-center border-none bg-zinc-800 px-3.5 font-mono text-[11px] font-bold text-white uppercase transition-all hover:bg-zinc-700 active:scale-95 sm:px-5 sm:text-xs ${buttonClassName}`}
      >
        SEARCH
      </button>
    </form>
  );
}

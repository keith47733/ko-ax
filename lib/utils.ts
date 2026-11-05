/**
 * Shared utility functions for KURA
 * Extracted for DRY compliance, consistent date handling, and dead-code reduction.
 */

/**
 * Extracts a 4-digit release or broadcast year from a TMDB date string (YYYY-MM-DD).
 * Returns fallback "—" when missing or unparseable.
 */
export function formatYear(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const cleaned = dateStr.trim();
  if (cleaned.length < 4) return "—";
  const year = cleaned.slice(0, 4);
  return isNaN(Number(year)) ? "—" : year;
}

/**
 * Parses numeric 4-digit year from date string. Returns null if invalid.
 */
export function parseYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const num = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(num) ? null : num;
}

/**
 * Categorizes a release date into discovery era decades.
 */
export function getDecadeFromDate(dateStr?: string | null): string {
  if (!dateStr) return "2020s";
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return "2020s";
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "1990s";
  return "classic";
}

/**
 * Resolves the primary active date for a media item (next broadcast date, or release date).
 */
export function getItemDate(item: {
  next_air_date?: string | null;
  release_date?: string | null;
}): string | null {
  return item.next_air_date || item.release_date || null;
}

/**
 * Formats a calendar banner date (YYYY-MM-DD) into full string and relative distance label.
 */
export function formatDateBanner(dateStr: string): { full: string; relative: string } {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);

    const full = dateObj
      .toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .toUpperCase();

    // Calculate relative distance
    const today = new Date();
    const todayNoon = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
    );
    const diffDays = Math.round(
      (dateObj.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24),
    );

    let relative = "";
    if (diffDays === 0) {
      relative = "TODAY";
    } else if (diffDays === 1) {
      relative = "TOMORROW";
    } else if (diffDays === -1) {
      relative = "YESTERDAY";
    } else if (diffDays > 1 && diffDays <= 6) {
      const weekday = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      relative = `THIS ${weekday}`;
    } else if (diffDays > 6 && diffDays <= 13) {
      const weekday = dateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();
      relative = `NEXT ${weekday}`;
    } else if (diffDays > 13) {
      relative = `IN ${diffDays} DAYS`;
    } else {
      relative = `${Math.abs(diffDays)} DAYS AGO`;
    }

    return { full, relative };
  } catch {
    return { full: dateStr.toUpperCase(), relative: "" };
  }
}

/**
 * Formats TMDB rating with 1 decimal precision, or returns a fallback.
 */
export function formatTmdbRating(rating?: number | null): string {
  if (rating === undefined || rating === null || isNaN(rating)) {
    return "UNRATED";
  }
  return rating.toFixed(1);
}

/**
 * Simple conditional class name merger.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}


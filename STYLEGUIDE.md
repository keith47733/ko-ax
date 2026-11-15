# KURA DESIGN SYSTEM SPECIFICATION (STYLEGUIDE.md)

**System Architecture:** High-Contrast Japandi + Luminous Pastels  
**Target Platform:** Kura Personal Media Storehouse  
**CSS Engine:** Tailwind CSS v4 + Next.js Font Optimization

---

## 1. Core Philosophy & Materiality

Kura balances **calm Japanese stone minimalism** with **luminous, high-energy pastels** and **uncompromising typographic contrast**.

Movie and TV posters are visually chaotic, rich in deep blacks, saturated primaries, and high chroma. A muted or desaturated palette gets buried; heavy black indicators overwhelm the layout. Kura solves this visual tension through three foundational principles:

1. **Warm Natural Canvas (`bg-canvas` / `var(--color-canvas)`):** An organic, linen-warm Japanese stone background (`#F4F3F0`) that reduces eye strain while allowing clean white cards to float organically.
2. **High-Chroma Luminous Pastels:** Three vivid, high-chroma pastel accents that hold their own against dynamic key art without looking like neon or muddy earth tones:
   - **Watched:** **Vivid Mint Sorbet (`bg-mint` / `#34D399`)** paired with `text-emerald-950 font-black` (8.5:1 contrast ratio).
   - **Want to Watch & Primary Action:** **Sunlit Coral / Tangerine (`bg-coral` / `#FF7A50`)** paired with `text-zinc-950 font-black` (6.2:1 contrast ratio).
   - **Watching:** **Electric Periwinkle (`bg-periwinkle` / `#818CF8`)** paired with `text-indigo-950 font-black` (8.1:1 contrast ratio). **Replaces overbearing solid black blocks.**
3. **Jet Ink Contrast & Large Type:** Zero washed-out gray text. All titles and headings use `text-zinc-950` (`#09090b`, 16.5:1 AAA contrast). Secondary metadata uses `text-zinc-800` or `text-zinc-700 font-bold` (9:1 to 12.7:1 contrast).

---

## 2. The 5 Iron Rules

1. **Architectural 1px Dark Grey Border:** Media cards feature a single-pixel dark grey border (`border border-zinc-400/90`) with soft `rounded-2xl` corners, cleanly framing poster artwork against the `#F4F3F0` canvas and eliminating white-edge bleed.
2. **Standardized Humanist Sans Typography:** All headings, titles, navigation links, and body copy use `font-sans` (Inter). `IBM_Plex_Mono` is reserved strictly for technical metadata (years, runtimes, TMDB scores, count badges). Filter section headers are enlarged to `text-sm font-black text-zinc-950 uppercase tracking-wider` and filter toggles to `text-xs sm:text-sm font-bold`.
3. **Slate Charcoal Active Selections:** Top navigation items, sidebar filter toggles, discover controls, and season switchers use refined charcoal for all active selections (`bg-zinc-800 text-white font-bold shadow-sm hover:bg-zinc-700`). Inactive buttons remain muted on canvas tracks (`text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 font-medium`). The global search "GO" button serves as a primary action anchor in `bg-zinc-800 text-white font-bold px-6 hover:bg-zinc-700`.
4. **Standardized Media Card HUD Footprint & Tightened Padding:**
   - **Vertical padding:** Reduced top padding (`px-4 pb-4 pt-2 sm:pt-2.5`) to pull title and metadata closer to the poster graphic.
   - **Secondary metadata:** Styled with `text-zinc-500 text-xs font-medium` (`MOVIE • ★ 7.9 TMDB`) to establish clear hierarchy.
   - **Status toggle button:** Standardized to **`w-16 h-11 rounded-xl`** (64px × 44px) in status color.
   - **Rating badge button:** Standardized to **`w-16 h-7.5 rounded-lg`** (64px × 30px, reduced by 33% height) with mono font formatted to 1 decimal place (e.g. `★ 8.4`, `★ 10.0`).
   - **Find Similar button:** Shrunk by 50% to **`w-8.5 h-8.5 rounded-lg`** (34px × 34px) in `bg-zinc-600 hover:bg-zinc-500 text-white` with centered compass icon, keeping the status toggle as the prominent primary action at the top right.
   - **Year badge:** Standardized to **`min-w-16 h-7.5 rounded-lg`** (64px × 30px, reduced by 33% height).
5. **Poster Gallery Brightness Calibration:** To prevent bright, aggressive poster artwork from overpowering the interface and washing out floating HUD badges, posters render at calibrated gallery brightness (`brightness-[0.88] saturate-[0.95]`), blooming to 100% on hover (`group-hover:brightness-100 group-hover:saturate-100 transition-all duration-300`). Opacity/transparency is strictly avoided because 20% opacity creates a milky, washed-out glaze over dark artwork.
6. **Strict WCAG AA & AAA Compliance:** Every text element must pass WCAG AA (minimum 4.5:1) and AAA where applicable (7:1+). Dark text on luminous pastels ensures 100% legibility on mobile and desktop.

---

## 3. Typography & Hierarchy

| Role                   | Font Family       | Weight        | Tailwind Class                                                       | Application                                                   |
| :--------------------- | :---------------- | :------------ | :------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Brand Masthead**     | **Sans**          | `900`         | `font-sans font-black tracking-tight text-zinc-950`                  | Header Logo, Auth masthead.                                   |
| **Hero & Page Titles** | **Sans**          | `900`         | `font-sans font-black tracking-tight text-zinc-950`                  | Detail view hero (`text-4xl` to `text-7xl`), console headers. |
| **Media Card Titles**  | **Sans**          | `700`         | `font-sans font-bold text-zinc-950 text-base sm:text-lg`             | Media card title row, quick-peek headers.                     |
| **Body & Synopses**    | **Sans**          | `400` / `500` | `font-sans font-normal text-zinc-800 text-lg sm:text-xl`             | Detail view synopsis, modal prose.                            |
| **Primary Metadata**   | **IBM Plex Mono** | `700` / `900` | `font-mono font-bold / font-black text-zinc-800 text-xs sm:text-sm`  | Release year badge, TMDB rating, status chips.                |
| **Secondary Metadata** | **IBM Plex Mono** | `700`         | `font-mono font-bold text-zinc-700 text-xs sm:text-[13px] uppercase` | Card subline (`MOVIE • 7.9 TMDB`), genre labels.              |

---

## 4. Color Palette & Contrast Matrix

| Token             | Name                    | Hex / Class                 | Text Pairing                  | Role & Usage                                               | Contrast Ratio |
| :---------------- | :---------------------- | :-------------------------- | :---------------------------- | :--------------------------------------------------------- | :------------- |
| `canvas`          | **Warm Japandi Canvas** | `bg-canvas` (`#F4F3F0`)     | `text-zinc-950`               | Main application backdrop. Organic, glare-free.            | 16.5 : 1 (AAA) |
| `surface`         | **Pure Ceramic White**  | `#FFFFFF`                   | `text-zinc-950`               | Media cards, modals, dropdowns, detail posters.            | 18.2 : 1 (AAA) |
| `surface-track`   | **Recessed Canvas Track** | `bg-canvas` (`#F4F3F0`)   | `text-zinc-700`               | Segmented control tracks, nav trays.                       | 11.4 : 1 (AAA) |
| `text-jet`        | **Jet Ink**             | `text-zinc-950` (`#09090b`) | —                             | Headings, card titles, active indicators.                  | 16.5 : 1 (AAA) |
| `text-strong`     | **Deep Charcoal**       | `text-zinc-800` (`#27272a`) | —                             | Body copy, synopsis, key metadata.                         | 12.7 : 1 (AAA) |
| `text-meta`       | **Slate Ink**           | `text-zinc-700 font-bold`   | —                             | Secondary metadata, badges, labels.                        | 9.0 : 1 (AAA)  |
| `accent-watched`  | **Vivid Mint Sorbet**   | `bg-mint` (`#34D399`)       | `text-emerald-950 font-black` | Watched state button, count badge, watched dot.            | 8.5 : 1 (AAA)  |
| `accent-want`     | **Sunlit Coral**        | `bg-coral` (`#FF7A50`)      | `text-zinc-950 font-black`    | Want to Watch button, state indicators.                    | 6.2 : 1 (AA)   |
| `accent-watching` | **Electric Periwinkle** | `bg-periwinkle` (`#818CF8`) | `text-indigo-950 font-black`  | Watching state button, in-progress queue badges.           | 8.1 : 1 (AAA)  |
| `active-toggle`   | **Deep Charcoal**       | `bg-zinc-800` (`#27272a`)   | `text-white font-bold`        | Active filter pill, active top nav view, Search GO anchor. | 12.7 : 1 (AAA) |

---

## 5. Status Toggle Specifications

Status triggers communicate user tracking state across the HUD, card popovers, and detail hero views.

| State                 | Background                                     | Text Color                    | Icon / Accent             | Hover / Active Feedback                                    |
| :-------------------- | :--------------------------------------------- | :---------------------------- | :------------------------ | :--------------------------------------------------------- |
| **Unselected / None** | `bg-white/95 backdrop-blur-md`                 | `text-zinc-950`               | Plus Icon (`w-5.5 h-5.5`) | `hover:bg-white hover:scale-105 active:scale-95 shadow-md` |
| **Want to Watch**     | `bg-coral shadow-md shadow-orange-500/20`      | `text-zinc-950 font-black`    | Bookmark Icon             | `hover:brightness-105 hover:scale-105 active:scale-95`     |
| **Watching**          | `bg-periwinkle shadow-md shadow-indigo-500/20` | `text-indigo-950 font-black`  | Play Icon                 | `hover:brightness-105 hover:scale-105 active:scale-95`     |
| **Watched**           | `bg-mint shadow-md shadow-emerald-500/20`      | `text-emerald-950 font-black` | Checkmark Icon            | `hover:brightness-105 hover:scale-105 active:scale-95`     |

---

## 6. Component Blueprints

### 6.1 The Media Card (Grid Blueprint)

The card floats with zero borders, featuring enlarged HUD badges and high-contrast typography:

```html
<article
  class="group relative flex cursor-pointer flex-col overflow-visible rounded-2xl border border-zinc-400/90 bg-white shadow-[0_10px_30px_rgb(0,0,0,0.06)] transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgb(0,0,0,0.12)]"
>
  <!-- Image Container -->
  <div
    class="relative aspect-2/3 w-full overflow-hidden rounded-t-[15px] bg-zinc-200"
  >
    <img
      src="..."
      class="h-full w-full object-cover brightness-[0.88] saturate-[0.95] transition-all duration-300 group-hover:scale-104 group-hover:brightness-100 group-hover:saturate-100"
      alt="Media Poster"
    />

    <!-- Top Left: Year Badge (Standardized min-w-16 h-7.5) -->
    <div
      class="pointer-events-none absolute top-2.5 left-2.5 flex h-7.5 min-w-16 items-center justify-center rounded-lg bg-white/95 px-2.5 font-mono text-xs leading-none font-black text-zinc-950 shadow-md ring-2 ring-white/90 backdrop-blur-md sm:text-sm"
    >
      1995
    </div>

    <!-- Top Right: Status Button & Rating Button -->
    <div
      class="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5"
    >
      <button
        class="bg-mint flex h-11 w-16 cursor-pointer items-center justify-center rounded-xl text-emerald-950 shadow-md ring-2 ring-white/90 backdrop-blur-md transition-all"
      >
        <svg class="h-5.5 w-5.5" fill="currentColor" viewBox="0 0 24 24">
          <!-- Checkmark / Play / Bookmark / Plus -->
        </svg>
      </button>

      <!-- Rating Button (Locked Width w-16, Height h-7.5, 1 Decimal Place) -->
      <button
        class="flex h-7.5 w-16 cursor-pointer items-center justify-center gap-1 rounded-lg bg-white/95 font-mono text-xs leading-none font-black text-zinc-950 shadow-md ring-2 ring-white/90 backdrop-blur-md transition-transform hover:scale-105 hover:bg-canvas sm:text-sm"
      >
        <span class="shrink-0 text-xs leading-none text-amber-500 sm:text-sm"
          >★</span
        >
        <span class="leading-none">7.9</span>
      </button>
    </div>

    <!-- Bottom Right: Find Similar Button (Shrunk 50% to w-8.5 h-8.5 in Deep Charcoal) -->
    <button
      class="absolute right-2.5 bottom-2.5 flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-lg bg-zinc-800 text-white shadow-md ring-2 ring-white/90 backdrop-blur-md transition-all hover:bg-zinc-700"
    >
      <svg
        class="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <!-- Compass Icon -->
      </svg>
    </button>
  </div>

  <!-- Content Container (Tightened Padding pt-2, Clear Hierarchy) -->
  <div class="flex flex-col gap-1 px-4 pt-2 pb-4">
    <h3
      class="truncate font-sans text-base leading-tight font-bold text-zinc-950 sm:text-lg"
    >
      BRAVEHEART
    </h3>
    <span
      class="font-mono text-xs font-medium tracking-wider text-zinc-500 uppercase"
    >
      MOVIE • ★ 7.9 TMDB
    </span>
  </div>
</article>
```

### 6.2 Filter Console & Segmented Control

```html
<div class="space-y-2">
  <span
    class="block font-mono text-sm font-black tracking-wider text-zinc-950 uppercase"
  >
    MEDIA TYPE
  </span>
  <div
    class="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1 text-center font-mono text-xs uppercase sm:text-sm"
  >
    <!-- Active Item: Deep Charcoal Pill -->
    <button
      class="rounded-lg bg-zinc-800 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-zinc-700"
    >
      ALL
    </button>
    <!-- Inactive Item: Muted Neutral -->
    <button
      class="rounded-lg py-2.5 font-medium text-zinc-600 transition-all hover:bg-zinc-200/80 hover:text-zinc-900"
    >
      MOVIES
    </button>
    <button
      class="rounded-lg py-2.5 font-medium text-zinc-600 transition-all hover:bg-zinc-200/80 hover:text-zinc-900"
    >
      TV
    </button>
  </div>
</div>
```

### 6.3 Media Detail View Hero & Season Browser

```html
<div class="min-h-screen bg-canvas text-zinc-950">
  <!-- Backdrop Banner -->
  <div class="relative h-[45vh] min-h-85 w-full overflow-hidden bg-zinc-950">
    <img
      src="{backdrop_url}"
      class="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-linear-to-t from-canvas via-canvas/20 to-transparent"
    ></div>
  </div>

  <!-- Main Hero Content -->
  <div
    class="relative z-10 mx-auto -mt-36 flex max-w-6xl flex-col gap-8 px-6 pb-16 md:flex-row lg:gap-12"
  >
    <!-- Poster Column: Centered on mobile, ~15% smaller on desktop -->
    <div class="mx-auto w-64 shrink-0 sm:w-72 md:mx-0 md:w-76 lg:w-80">
      <img
        src="{poster_url}"
        class="aspect-2/3 w-full rounded-2xl border border-zinc-400/90 object-cover shadow-2xl shadow-zinc-950/20"
      />
    </div>

    <!-- Metadata & Controls Column: Centered on mobile, Left-aligned on desktop -->
    <div class="min-w-0 flex-1">
      <h1
        class="mb-4 text-center font-sans text-4xl leading-[1.08] font-black tracking-tight text-balance text-zinc-950 sm:text-5xl md:text-left md:text-6xl lg:text-7xl"
      >
        Braveheart
      </h1>

      <div
        class="mb-6 flex flex-wrap items-center justify-center gap-3 font-mono text-sm font-bold text-zinc-800 sm:text-base md:justify-start md:text-lg"
      >
        <span>1995</span>
        <span class="text-zinc-400">•</span>
        <span>Feature Film</span>
        <span class="text-zinc-400">•</span>
        <span class="flex items-center gap-1.5 font-black text-zinc-950">
          <span class="font-black text-amber-500">★</span>
          <span>7.9 TMDB</span>
        </span>
      </div>

      <!-- High-Pop Luminous Status Buttons -->
      <div
        class="mb-8 grid max-w-xl grid-cols-3 gap-2.5 rounded-2xl bg-canvas p-1.5"
      >
        <button
          class="bg-coral rounded-xl px-3 py-3.5 font-mono text-xs font-black tracking-wider text-zinc-950 uppercase shadow-md shadow-orange-500/20 sm:text-sm md:text-base"
        >
          WANT TO WATCH
        </button>
        <button
          class="rounded-xl bg-white px-3 py-3.5 font-mono text-xs font-bold tracking-wider text-zinc-800 uppercase shadow-xs hover:bg-zinc-50 hover:text-zinc-950 sm:text-sm md:text-base"
        >
          WATCHING
        </button>
        <button
          class="bg-mint rounded-xl px-3 py-3.5 font-mono text-xs font-black tracking-wider text-emerald-950 uppercase shadow-md shadow-emerald-500/20 sm:text-sm md:text-base"
        >
          WATCHED
        </button>
      </div>

      <!-- Synopsis -->
      <div class="mb-8 max-w-3xl">
        <p
          class="font-sans text-lg leading-relaxed font-normal text-zinc-800 sm:text-xl md:text-2xl"
        >
          Enraged at the slaughter of Murron, his new bride and childhood
          love...
        </p>
      </div>

      <!-- Deep Charcoal Find Similar Button -->
      <div>
        <a
          href="/discover?..."
          class="inline-flex cursor-pointer items-center gap-2.5 rounded-2xl bg-zinc-800 px-6 py-3.5 font-mono text-sm font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-zinc-700 sm:text-base"
        >
          <svg
            class="h-5 w-5 shrink-0 stroke-[2.2]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            ...
          </svg>
          <span>FIND SIMILAR TITLES</span>
        </a>
      </div>

      <!-- TV Season & Episode Checklist with 1px Grey Border & Filter-Toggle Season Buttons -->
      <div
        class="mt-10 max-w-3xl overflow-hidden rounded-2xl border border-zinc-400/90 bg-white shadow-[0_12px_36px_rgb(0,0,0,0.06)]"
      >
        <div
          class="flex items-center justify-between border-b border-zinc-200 bg-canvas px-6 py-4 font-sans font-bold text-zinc-950"
        >
          <span class="text-base tracking-tight sm:text-lg"
            >EPISODE PROGRESSION RADAR</span
          >
          <span
            class="bg-mint rounded-xl px-3.5 py-1 font-mono text-xs font-black text-emerald-950 shadow-sm sm:text-sm"
          >
            8 / 10 WATCHED
          </span>
        </div>

        <!-- Season Selector: Filter Toggle Group Track -->
        <div
          class="flex flex-wrap gap-1.5 border-b border-zinc-200 bg-canvas p-1.5"
        >
          <!-- Active Season Button -->
          <button
            class="flex items-center gap-2 rounded-lg bg-zinc-800 px-3.5 py-2 font-mono text-xs font-bold text-white uppercase shadow-sm transition-all hover:bg-zinc-700 sm:text-sm"
          >
            <input
              type="checkbox"
              checked
              class="h-4.5 w-4.5 rounded accent-emerald-600"
            />
            <span>SEASON 1</span>
            <span class="font-mono text-xs font-medium text-zinc-200"
              >(8/10)</span
            >
          </button>
          <!-- Inactive Season Button -->
          <button
            class="flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-xs font-medium text-zinc-600 uppercase transition-all hover:bg-zinc-200/80 hover:text-zinc-900 sm:text-sm"
          >
            <input
              type="checkbox"
              class="h-4.5 w-4.5 rounded accent-emerald-600"
            />
            <span>SEASON 2</span>
            <span class="font-mono text-xs font-medium text-zinc-500"
              >(0/10)</span
            >
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

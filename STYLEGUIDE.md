# KO-AX DESIGN SYSTEM SPECIFICATION (STYLEGUIDE.md)

**System Architecture:** Modern Apothecary / Archival Minimalist  
**Target Platform:** KO-AX Personal Media Engine  
**CSS Engine:** Tailwind CSS v4 + Next.js Font Optimization

---

## 1. Core Philosophy & Materiality

KO-AX embodies the **Modern Apothecary** aesthetic. The interface should feel like a high-end 19th-century botanical index or a clinical vintage archive. It relies on unbleached parchment tones, delicate tarnished framing, classic typography, and muted, saturated jewel tones for interactions.

### The 5 Iron Rules

1. **Delicate Framing:** Heavy borders are banned. Use thin `1px` lines (`border border-stone-300` or `border-stone-400`) to mimic glass slides and paper partitions.
2. **Soft Geometry:** Apply `rounded-md` globally to cards, buttons, and inputs to emulate the smooth edges of pressed glass or cut paper.
3. **Warm, Ambient Shadows:** Replace harsh offset shadows with soft, warm diffusion (`shadow-md shadow-stone-800/10`) to create a sense of floating archival cards.
4. **Jewel Tone Accents:** Use deep, saturated, natural colors for statuses—specifically **Deep Emerald** and **Burnt Orange**. No neon or primary web colors.
5. **Accessibility (WCAG AA):** Text contrast must be strictly maintained. Muted/secondary text must be no lighter than `text-stone-500`. Text on dark accent buttons must be pure white (`text-white`) for high legibility.

---

## 2. Typography

Typography mixes elegant, high-contrast book serifs with strict, clinical sans-serifs for data.

| Role                | Font Family                  | Weight       | Tailwind Class                       | Application                                                    |
| :------------------ | :--------------------------- | :----------- | :----------------------------------- | :------------------------------------------------------------- |
| **Brand / Display** | **Playfair Display**         | `600`, `700` | `font-serif tracking-tight`          | Main logo, page headers, media titles in Detail View.          |
| **Body / UI**       | **Inter** (or standard Sans) | `400`, `500` | `font-sans`                          | Standard descriptions, navigation, dropdowns, synopsis text.   |
| **Data / Metadata** | **IBM Plex Mono**            | `500`, `600` | `font-mono uppercase tracking-wider` | Years, ratings, episode counters, system tags, vintage labels. |

---

## 3. Color Palette (Tailwind Stone Scale)

The interface drops the sterile zincs and relies entirely on Tailwind's warm `stone` scale, accented by dark jewel tones.

| Token            | Theme Color          | Tailwind Class              | Role & Usage                                              |
| :--------------- | :------------------- | :-------------------------- | :-------------------------------------------------------- |
| `canvas`         | **Unbleached Paper** | `bg-stone-100`              | Main application background. Soft and warm.               |
| `surface`        | **Clean Vellum**     | `bg-stone-50` or `bg-white` | Background for Media Cards and floating containers.       |
| `border`         | **Tarnished Silver** | `border-stone-300`          | Standard 1px structural framing for cards and inputs.     |
| `text-main`      | **Charcoal Ink**     | `text-stone-900`            | Primary readable text, titles, and active icons.          |
| `text-muted`     | **Faded Ink**        | `text-stone-500`            | Secondary metadata, release years, inactive placeholders. |
| `accent-want`    | **Burnt Orange**     | `bg-orange-700 text-white`  | **Want to Watch** primary action, warnings, alerts.       |
| `accent-watched` | **Deep Emerald**     | `bg-emerald-800 text-white` | **Watched & Rated** success state, completion bars.       |

---

## 4. Status Toggle Button Rules

Status selectors communicate tracking state. They should look like vintage tincture labels when active.

| State                      | Background       | Text             | Border                    | Tailwind Classes                                                                                     |
| :------------------------- | :--------------- | :--------------- | :------------------------ | :--------------------------------------------------------------------------------------------------- |
| **Default (Unselected)**   | `bg-stone-50`    | `text-stone-600` | `border border-stone-300` | `bg-stone-50 text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-md transition-colors` |
| **Want to Watch (Active)** | **Burnt Orange** | Pure White       | `border-transparent`      | `bg-orange-700 text-white border-transparent font-medium rounded-md shadow-sm`                       |
| **Watching (Active)**      | **Charcoal**     | Pure White       | `border-transparent`      | `bg-stone-800 text-white border-transparent font-medium rounded-md shadow-sm`                        |
| **Watched (Active)**       | **Deep Emerald** | Pure White       | `border-transparent`      | `bg-emerald-800 text-white border-transparent font-medium rounded-md shadow-sm`                      |

---

## 5. Component Blueprints (Tailwind v4)

### 5.1 The Media Card (Main View)

The card must feel like a delicate, rounded glass slide.

```html
<article
  class="bg-stone-50 border border-stone-300 rounded-md shadow-sm hover:shadow-md shadow-stone-800/5 transition-all overflow-hidden flex flex-col"
>
  <!-- Image Container -->
  <div
    class="relative w-full aspect-2/3 bg-stone-200 border-b border-stone-200"
  >
    <img src="..." class="object-cover w-full h-full" alt="Poster" />
    <!-- Year Badge - Vintage Label Style -->
    <div
      class="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm border border-stone-300 rounded text-[10px] font-mono font-bold text-stone-800"
    >
      1995
    </div>
  </div>

  <!-- Content -->
  <div class="p-4 flex flex-col gap-1">
    <h3
      class="font-serif text-lg font-semibold text-stone-900 leading-tight truncate"
    >
      BRAVEHEART
    </h3>
    <span class="font-mono text-xs text-stone-500">MOVIE • 7.9 TMDB</span>
  </div>
</article>
```

### 5.2 Detail View with Cinematic Backdrop

The Detail View must utilize the TMDB `backdrop_path`. The backdrop serves as an atmospheric header, fading into the unbleached canvas, with the main movie poster overlapping the transition.

```html
<!-- Full Page Detail Wrapper -->
<div class="min-h-screen bg-stone-100">
  <!-- Backdrop Banner -->
  <div class="relative w-full h-[40vh] min-h-75 bg-stone-900">
    <!-- Image with Opacity -->
    <img
      src="{backdrop_url}"
      class="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
    />
    <!-- Gradient Fade to Canvas Color -->
    <div
      class="absolute inset-0 bg-linear-to-t from-stone-100 via-stone-100/20 to-transparent"
    ></div>
  </div>

  <!-- Content Container (Pulled up to overlap backdrop) -->
  <div
    class="max-w-6xl mx-auto px-6 -mt-32 relative z-10 flex flex-col md:flex-row gap-8 pb-12"
  >
    <!-- Left Column: Poster -->
    <div class="w-64 shrink-0">
      <img
        src="{poster_url}"
        class="w-full rounded-md border-4 border-stone-50 shadow-lg shadow-stone-900/20"
      />
    </div>

    <!-- Right Column: Metadata & Controls -->
    <div class="flex-1 pt-4 md:pt-32">
      <!-- Title -->
      <h1
        class="font-serif text-5xl md:text-6xl font-bold text-stone-900 tracking-tight mb-2 text-balance"
      >
        Braveheart
      </h1>

      <!-- Vintage Meta Strip -->
      <div
        class="flex flex-wrap items-center gap-3 font-mono text-xs text-stone-600 mb-8"
      >
        <span class="px-2 py-1 bg-stone-200 border border-stone-300 rounded"
          >1995</span
        >
        <span class="px-2 py-1 bg-stone-200 border border-stone-300 rounded"
          >RATED R</span
        >
        <span>177 MINS</span>
      </div>

      <!-- Tracking Protocol Panel -->
      <div
        class="bg-stone-50 border border-stone-300 rounded-md p-6 max-w-xl shadow-sm mb-8"
      >
        <h4
          class="font-mono text-[10px] text-stone-400 uppercase tracking-widest mb-4 border-b border-stone-200 pb-2"
        >
          Tracking Protocol
        </h4>

        <!-- Toggle Group -->
        <div class="grid grid-cols-3 gap-2">
          <button
            class="bg-stone-50 text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-md py-2 text-xs font-medium transition-colors"
          >
            WANT TO WATCH
          </button>
          <button
            class="bg-stone-50 text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-md py-2 text-xs font-medium transition-colors"
          >
            WATCHING
          </button>
          <!-- Active State Example -->
          <button
            class="bg-emerald-800 text-white border-transparent rounded-md py-2 text-xs font-medium shadow-sm"
          >
            WATCHED & RATED
          </button>
        </div>
      </div>

      <!-- Synopsis -->
      <div
        class="prose prose-stone max-w-3xl font-sans text-stone-700 leading-relaxed"
      >
        <p>
          Enraged at the slaughter of Murron, his new bride and childhood
          love...
        </p>
      </div>
    </div>
  </div>
</div>
```

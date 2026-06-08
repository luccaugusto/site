# Architecture & Conventions

The full reference for `luccaaugusto.xyz`. For the quick operational guide
(how to run, build, deploy) see **[../AGENTS.md](../AGENTS.md)**.

Contents:
1. [Jekyll file structure](#1-jekyll-file-structure)
2. [Layouts & includes](#2-layouts--includes)
3. [Sections of the website](#3-sections-of-the-website)
4. [CSS styling choices](#4-css-styling-choices)
5. [JavaScript](#5-javascript)
6. [Plugins](#6-plugins)
7. [Integrations & external services](#7-integrations--external-services)
8. [Helper scripts](#8-helper-scripts)

---

## 1. Jekyll file structure

A standard Jekyll 4 layout with a few deliberate choices in `_config.yml`:

- **`markdown: kramdown`**, **`theme: minima`** (used as a base and heavily
  overridden by `assets/css/style.css`).
- **Collections** (`blog`, `ded`, `tablaturas`) all set `output: true`. They are
  used instead of Jekyll's built-in `posts` specifically to get **clean,
  dateless URLs** (e.g. `/blog/animes-preferidos/` rather than
  `/2021/09/20/...`). Source lives in `_blog/`, `_ded/`, `_tablaturas/`.
- **`include: [.well-known]`** — dot-directories are excluded from the build by
  default. This is included so Chrome DevTools' probe for
  `/.well-known/appspecific/com.chrome.devtools.json` gets a `200` instead of a
  `404` (otherwise WEBrick logs an ERROR on every dev request).
- **`sass: { quiet_deps, silence_deprecations: [import, color-functions] }`** —
  silences Dart Sass deprecation noise from minima's third-party SCSS.
- A block of **`url_*` site variables** holds most external links (Spotify,
  Letterboxd, MyAnimeList, Orkut, LinkedIn, and the sibling subdomains
  `pds.`/`dev.`/portfolio). Templates reference them as `{{ site.url_spot }}`,
  etc. — change a link in one place. (Two links don't follow the convention:
  GitHub is `github_username` and the Amazon wishlist is `wish_amazon`, both
  also in `_config.yml`.)

### `_data/` (gallery sources)

Each gallery page renders from a YAML list of `{ nome, link, thumb }` entries.

| File | Source of truth | Notes |
|------|-----------------|-------|
| `skate.yml`, `wallpapers.yml`, `flores.yml`, `minhas_fotos.yml`, `suspensao.yml` | **Generated** by `build.sh` | Do **not** hand-edit — regenerated from `images/<dir>/` on every build. |
| `gongo.yml` | **Hand-maintained** | Not touched by `build.sh`. |

### Directories at a glance

- `assets/` — `css/`, `js/`, `icons/` (favicons + social/link icons), `img/`
  (UI element images: backgrounds, the back button), the
  `Ethnocentric-Regular.otf` heading font, and synthwave reference mockups.
- `cursors/` — `.cur` cursor files (Adventure Time, etc.) read at build time by
  the Liquid-templated `assets/js/random_cursor.js` (no shell generator).
- `images/` — content media (personal photos, downloadable art, the per-gallery
  folders `fotos-skate/`, `wallpapers/`, `flores/`, `minhas-fotos/`,
  `suspensao/`, `gongo/`). Site-chrome graphics live in `assets/`
  instead. Generated `thumbs/` subfolders are gitignored.
- `downloads/` — downloadable PDFs (Excel course, "Regras Camelô", calendars).
- `docs/` — design specs and this document.
- `scripts/` — `pb-bulk-import.mjs` (Node helper to bulk-seed the PocketBase feed).

---

## 2. Layouts & includes

### Layouts (`_layouts/`)

| Layout | Body / shell | Used by |
|--------|--------------|---------|
| `home.html` | Minimal: `<body class="palmtree">` + `{{ content }}`. The page supplies its own structure. | `index`, `gongo`, `flores` |
| `post.html` | **Magazine** shell (`.zine-body` → `.magazine-layout`): back button, optional rotated title, content, scroll-to-top. | blog posts, `gram`, `treino`, `standup` |
| `todos_posts.html` | Magazine shell built for **list** pages (always shows the title). | `blog`, `ded` |
| `fotos.html` | Magazine shell variant that hides the title when it's literally "Fotos". | `skate` |
| `gallery.html` | Legacy shell: `<body class="palmtree">` + `.geral` wrapper + back button. | `wallpapers`, `eu`, `suspensao` |
| `default` | minima's built-in fallback. | `404` |

Two visual systems coexist: the **magazine** shell (`zine-body` / `post`,
`todos_posts`, `fotos`) is the current redesign; the **`palmtree` + `.central`
neon-box** shell (`home`, `gallery`) is the older look still used by several
pages.

### Includes (`_includes/`)

| Include | Purpose |
|---------|---------|
| `head.html` | `<head>`: meta, `<title>`, favicons, loads `style.css`, and **defers the two global JS files** (`random_cursor`, `piada`). Included by every layout. |
| `back.html` | "Back" button (`history.back()`). Used by `post`, `gallery`, `fotos`. |
| `last_posts.html` | First 6 blog post titles as links (homepage Blog panel). |
| `galery.html` | Reusable gallery loop (image/video aware), `srcset` thumbnails. Used by `eu`. |
| `rodape.html` | Footer with `{{ site.copyright }}`. **Currently unused** (only the removed `random` layout included it). |

---

## 3. Sections of the website

| Page | URL | Layout | What it is |
|------|-----|--------|------------|
| Home | `/` | `home` | **Zine canvas** of floating panels: *Meus Trem* (link hub), *Portais* (empty placeholder), *Piada do Dia* (random joke), *Salve Uriel* (ASCII art), *Blog* (latest posts), *Fotos*. |
| Blog | `/blog` | `todos_posts` | List of all `_blog` posts with excerpts; each post renders via `post`. |
| Feed | `/gram.html` | `post` | **Instagram-like feed** — client-side fetch from PocketBase, carousels, video, lightbox. |
| Treino | `/treino.html` | `post` | A structured **workout sheet**; JS clones today's card to the top. |
| Gongo | `/gongo.html` | `home` | "Você e o Gongo" — podcast/video links + an image guide (from `gongo.yml`). |
| DeD | `/ded.html` | `todos_posts` | Dungeons & Dragons campaign material (`_ded` collection). |
| Eu | `/eu.html` | `gallery` | "Eu e meus trem" personal-photo gallery (`minhas_fotos.yml`). |
| Skate | `/skate.html` | `fotos` | Skate photos & clips (`skate.yml`). |
| Wallpapers | `/wallpapers.html` | `gallery` | Wallpapers the author made (`wallpapers.yml`). |
| Flores | `/flores.html` | `home` | Hand-drawn flowers, zig-zag layout (`flores.yml`). |
| Suspensão | `/suspensao.html` | `gallery` | Body-suspension photos/clips (`suspensao.yml`). |
| Standup | `/standup.html` | `post` | A standup-comedy video. |
| 404 | `/404.html` | `default` | Custom not-found page. |
| Tablaturas | — | — | `_tablaturas` collection (guitar tabs); rendered per-item, no index page yet. |

---

## 4. CSS styling choices

Three stylesheets, no preprocessor of our own (minima's SCSS is compiled by the
theme; our files are plain CSS).

### Design tokens (synthwave zine palette)

Used consistently across the redesign and the two scoped stylesheets:

| Token | Value | Role |
|-------|-------|------|
| Beige | `#e8d5b7` | Page background of magazine pages |
| Paper | `#f4f0e6` | The "open magazine" sheet |
| Magenta | `#ff2d95` | Primary accent (titles, links-hover, "today") |
| Cyan | `#00f3ff` | Secondary accent (badges, scroll-to-top) |
| Orange | `#f0a830` / `#ff8100` | Header tape strips / neon glows |
| Black | `#000` | Borders + hard offset shadows |

Headings use the **`Ethnocentric`** font (`@font-face`, loaded from
`assets/Ethnocentric-Regular.otf`).

### `assets/css/style.css` (global, ~780 lines)

Loaded on every page via `head.html`. It is layered by era — older utility
classes sit alongside the newer redesign systems:

- **Atomic / utility classes (legacy):** colors (`.cor1`–`.cor7`, `.turquoise`,
  `.synth-purple`, …), font sizes (`.font10`–`.font25`), widths (`.w25`/`.w50`/
  `.w100`…), alignment helpers, and neon glow boxes (`.neon`, `.neon-y` =
  big colored `box-shadow`). Class names are Portuguese.
- **Page backgrounds:** body classes set fixed, cover background images —
  `.palmtree`, `.skate`, `.take-me-away`.
- **Gallery primitives:** `.galeria`, `.central` (the bordered neon content box),
  `.container-img` / `.container-flor`, `.imagem` (`object-fit: cover`),
  `.linha*` flex rows, `.thumbnail`, `.gongo-item`.
- **Zine canvas (homepage redesign):** `.zine-canvas` is a full-viewport stage;
  `.zine-panel`s are **absolutely positioned** at hand-tuned `top/left/right` +
  `rotate()` for an intentionally off-grid, poster-like collage. `.crooked-header`
  is the skewed "taped" header strip (with a `::before` star marker from
  `assets/img/star-marker.png` and a hard `box-shadow`). A `max-width: 808px` query
  collapses the absolute layout into a centered flex column.
- **Magazine layout (blog / fotos redesign):** `.zine-body` (beige) centers a
  `.magazine-layout` "paper" sheet that fakes an **open-magazine center fold**
  via a `linear-gradient`. `.magazine-title` is a rotated magenta block with a
  hard shadow; `.magazine-content` flows text in **CSS multi-column** newspaper
  columns (`column-width: 400px`). Includes `.scroll-to-top` and `.blog-list`.
- **Responsive:** a `max-width: 808px` block hides desktop-only chrome, resizes
  the back button, and collapses columns to one.

### `assets/css/gram.css` (feed, ~84 lines)

Scoped to the photo feed. **Deliberately minimal** — meant to be skinned into the
synthwave look later. Provides: a responsive 2-col → 1-col `.gram-feed` grid;
`.gram-carousel` using CSS **scroll-snap** with hidden scrollbars and position
`.gram-dots`; circular overlay buttons (`.gram-download`, `.gram-arrow`); a
`::after` play-triangle hint on video posters; and a fixed-overlay
`.gram-modal` lightbox.

### `assets/css/treino.css` (workout sheet, ~91 lines)

Everything scoped under `.treino`. Reskins the workout page into the zine theme:
the wrapper uses **`column-span: all`** to break out of `.magazine-content`'s
newspaper columns and span full width without touching the shared layout.
Recurring motif is the **zine card** = `2px solid #000` border + `4px 4px 0 #000`
hard offset shadow (cards, stats, table, callouts). `.pill`s are sticker-style
badges in the accent palette; today's cloned card gets a **magenta** offset
shadow to read as "this is today". Grids collapse to one column under 900px.

---

## 5. JavaScript

All vanilla, no bundler, no dependencies. `head.html` loads two scripts
**`defer`** on every page; two more are page-local.

### Global (loaded everywhere)

| File | What it does |
|------|--------------|
| `random_cursor.js` | On load, randomly swaps the page cursor for one of eight `.cur` files (Adventure Time, kunai, …) — roughly a 1-in-9 chance of each, default otherwise. **Liquid-templated**: front matter + a `site.static_files` loop builds the cursor array from `cursors/*.cur` at Jekyll build time. Add/remove `.cur` files in `cursors/`, don't hand-edit the array. |
| `piada.js` | Picks a random "piada do dia" (dad-joke pun) from an inline array and injects it into `#p-piada` (homepage panel). |

### Page-local

| File | Page | What it does |
|------|------|--------------|
| `gram.js` | `gram.html` | The **feed renderer**. Fetches `GET /api/collections/posts/records?sort=-pinned,-published&expand=media_via_post` from PocketBase (`window.GRAM_PB_URL`), then renders single posts and **carousels** (arrows + dots), images and `<video>`, light thumbnails (`?thumb=600x0`) upgrading to full-res in a **modal lightbox**, per-item **download** buttons (blob fetch with new-tab fallback), and "Carregar mais" pagination. |
| `treino.js` | `treino.html` | Clones the workout card matching the **viewer's local weekday** to a "Hoje —" block at the top; shows a rest-day note on weekends. The week grid below stays the single source of truth. |

> **Note:** `gram.html` includes a clearly-marked **TEST-DATA `<script>`** that
> monkey-patches `fetch` to return mock posts (picsum images + a sample video) so
> the page previews before PocketBase is live. It must be removed/commented
> before the page relies on real data.

---

## 6. Plugins

Declared in `Gemfile` / `_config.yml`:

- **`jekyll-feed`** — generates the Atom feed at `/feed.xml`.
- **`jekyll-loading-lazy`** — automatically adds `loading="lazy"` to images at
  build time (galleries lean on this).
- **`minima` (~2.5)** — the base theme. Mostly overridden by `style.css`, but it
  still provides the `default` layout and transitively pulls in
  **`jekyll-seo-tag`** and **`jekyll-sass-converter`** (SCSS compilation).
- **`kramdown`** — the Markdown engine for posts/collections.

`webrick`, `logger`, and `bigdecimal` are in the Gemfile to satisfy Ruby 3.4+ /
Jekyll-serve runtime needs, not as content plugins.

---

## 7. Integrations & external services

- **PocketBase** (`gram.luccaaugusto.xyz`) — a self-hosted single-binary backend
  (SQLite + auth + admin UI + file storage + REST API) powering the dynamic
  photo feed. The static site fetches it client-side at view time, so posts
  publish instantly without a rebuild. Full design & ops in
  `docs/2026-06-04-instagram-feed-design.md` and `-plan.md`;
  `scripts/pb-bulk-import.mjs` seeds it from a folder of media.
- **GitHub Actions → VPS** — `ci.yml` builds with `build.sh` and `rsync`s
  `_site/` over SSH to the web root on every push. ImageMagick is installed in
  CI for thumbnail generation.
- **Embeds** — YouTube (FDP video, the unused welcome window), Spotify/Deezer
  (Gongo podcast episode).
- **Profile/links** — GitHub, Spotify, Letterboxd, MyAnimeList, Orkut, LinkedIn,
  and an Amazon wishlist, stored in `_config.yml` (mostly as `url_*` vars;
  GitHub is `github_username`, the wishlist is `wish_amazon`).
- **Sibling subdomains** — `pds.luccaaugusto.xyz` (Papo de Sauna),
  `dev.luccaaugusto.xyz` (dev portfolio).

---

## 8. Helper scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | Production build: regenerate galleries + thumbnails, stamp blog "Atualizado em" dates, `jekyll build`, strip `*.sh` from `_site/`. Run by CI. |
| `compress_img.sh <dirs…>` | Flattens PNGs to compressed JPEGs via ImageMagick. |
| `css_inutil.sh` | Lists CSS classes in `style.css` not referenced by any HTML — a dead-CSS finder. |
| `scripts/pb-bulk-import.mjs` | Node helper: each subfolder becomes a post, its files become ordered media, uploaded to PocketBase. |

> Reminder: per [AGENTS.md](../AGENTS.md), run all of these **inside the Docker
> container**, not on the host.
</content>

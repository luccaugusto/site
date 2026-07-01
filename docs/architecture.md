# Architecture & Conventions

The full reference for `luccaaugusto.xyz`. For the quick operational guide
(how to run, build, deploy) see **[../AGENTS.md](../AGENTS.md)**.

Contents:
1. [Jekyll file structure](#1-jekyll-file-structure)
2. [Layouts & includes](#2-layouts--includes)
3. [Sections of the website](#3-sections-of-the-website)
4. [CSS styling choices](#4-css-styling-choices)
5. [JavaScript](#5-javascript)
6. [The Backrooms game](#6-the-backrooms-game)
7. [Plugins](#7-plugins)
8. [Integrations & external services](#8-integrations--external-services)
9. [Helper scripts](#9-helper-scripts)

---

## 1. Jekyll file structure

A standard Jekyll 4 layout with a few deliberate choices in `_config.yml`:

- **`markdown: kramdown`**, **`theme: minima`** (used as a base and heavily
  overridden by `assets/css/style.css`).
- **Collections** (`blog`, `tablaturas`) both set `output: true`. They are
  used instead of Jekyll's built-in `posts` specifically to get **clean,
  dateless URLs** (e.g. `/blog/animes-preferidos/` rather than
  `/2021/09/20/...`). Source lives in `_blog/` and `_tablaturas/`.
- **`exclude:`** carries the usual Jekyll defaults plus three project-specific
  entries so they don't ship in `_site/`: `assets/backrooms/js/tests` (the
  Node test suite), `assets/backrooms/js/package.json` (only there to flip the
  test dir into ES-module mode), and `assets/backrooms/images/fundo.kra` (the
  Krita source file for the game background).
- A block of **`url_*` / `user_*` site variables** holds most external links
  (PDS, dev portfolio, MyAnimeList, Letterboxd, LinkedIn, the Jellyfin media
  server, Instagram, and the PocketBase admin login). Templates reference them
  as `{{ site.url_letterboxd }}`, `{{ site.user_instagram }}`, etc. — change a
  link in one place. Two don't follow the `url_`/`user_` convention: GitHub is
  `github_username` and the Amazon wishlist is `wish_amazon`.

### `_data/` (galleries + content lists)

Gallery pages render from a YAML list of `{ nome, link, thumb }` entries; two
extra data files feed the homepage.

| File | Source of truth | Notes |
|------|-----------------|-------|
| `wallpapers.yml`, `flores.yml`, `suspensao.yml` | **Generated** by `build.sh` | Do **not** hand-edit — regenerated from `images/<dir>/` on every build. |
| `skate.yml` | **Legacy** | Still consumed by `skate.html`, but **no longer regenerated** by `build.sh`. Skate media is slated to move into the PocketBase feed (tagged `skate`) — see `README.md`. |
| `gongo.yml` | **Hand-maintained** | The "Você e o Gongo" links/guide. Not touched by `build.sh`. |
| `piadas.yml` | **Hand-maintained** | Dad-joke puns for the homepage caveira host (`piada.js` bakes them in at build time). |
| `splashes.yml` | **Hand-maintained** | Rotating homepage splash taglines (`splash.js` bakes them in). |

### Directories at a glance

- `assets/` — `css/`, `js/`, `icons/` (favicons + social/link icons), `img/`
  (UI element images: backgrounds, back/window buttons, `caveira-anfitriao`,
  `billboard.png`, `noise.png`, `mao.png`, `404.png`, treino demo pics under
  `img/treino/`), the `Ethnocentric-Regular.otf` heading font, and the
  self-contained **`backrooms/`** game bundle (see §6).
- `cursors/` — `.cur` cursor files (Adventure Time, etc.) read at build time by
  the Liquid-templated `assets/js/random_cursor.js` (no shell generator).
- `images/` — content media in per-section folders: `blog/`, `flores/`,
  `fotos-skate/`, `gongo/`, `suspensao/`, `wallpapers/`. Site-chrome graphics
  live in `assets/` instead. Generated `thumbs/` subfolders are gitignored.
- `downloads/` — downloadable files, grouped into folders (`computadoresDoceis`,
  `cursoexcell`) plus loose files; the Downloads page lists them automatically.
- `docs/` — this document.
- `scripts/` — `pb-bulk-import.mjs` (Node helper to bulk-seed the PocketBase feed).

---

## 2. Layouts & includes

### Layouts (`_layouts/`)

| Layout | Body / shell | Used by |
|--------|--------------|---------|
| `home.html` | `<html class="zine-home">` + `<body class="palmtree">`; drops in the noise overlay then `{{ content }}`. The page supplies its own structure. | `index`, `gongo`, `misc`, `downloads` |
| `post.html` | **Magazine** shell (`.zine-body palmtree` → `.magazine-layout`): back button, optional rotated title, `.magazine-content` (optional `single_column`), scroll-to-top, and a decorative `#magazine-holding-hand` (`mao.png`). | blog posts, `gram`, `treino`, `standup` |
| `lista.html` | **Zine-panel list** shell (`palmtree` bg + a single `.zine-panel.panel-lista`): back button, crooked-header title, and a `.lista-itens` list of `site[page.collection]` items as title links. | `blog`, `tablaturas` |
| `fotos.html` | Magazine shell variant (`.zine-body`) that hides the title when it's literally "Fotos". | `skate` |
| `gallery.html` | `.zine-body palmtree billboard-page`: back button + a `.gallery-grid` (columns from `page.columns`) rendered **inside the billboard screen** (via the `billboard` include). | `wallpapers`, `flores`, `suspensao` |
| `erro.html` | Minimal `<body class="erro-404">` + noise + content. | `404` |

Two visual systems coexist: the **magazine** shell (`zine-body` / `post`,
`fotos`) and the **`palmtree` + `.zine-panel`** poster shell (`home`, `lista`,
`gallery`). Every layout drops the film-grain `noise` overlay into its `<body>`
(see §4). minima's built-in `default` layout is no longer used — the 404 moved
to the custom `erro` layout.

### Includes (`_includes/`)

| Include | Purpose |
|---------|---------|
| `head.html` | `<head>`: meta, `<title>`, favicons + web manifest, loads `style.css`, and **defers the three global JS files** (`random_cursor`, `piada`, `splash`). Included by every layout. |
| `noise.html` | Site-wide **film-grain overlay** — a `.overlay.noise` div plus inline `@keyframes grain` CSS, dropped into every layout's `<body>`. Oversized/offset, `pointer-events:none`, `z-index:800`. |
| `back.html` | "Back" button (`history.back()`). Used by `post`, `gallery`, `fotos`, `lista`, `misc`, `downloads`. |
| `billboard.html` | The synthwave **billboard** frame (`billboard.png` + a perspective-warped `.billboard-screen` + optional scroll-to-top). Renders `include.content` inside the screen and loads `billboard-screen.js`. Used by the `gallery` layout (wraps the grid) and the homepage (wraps the *Portais* tiles). Accepts `hide_scroll_to_top="true"`. |
| `last_posts.html` | First blog post titles as links (homepage Blog panel). |
| `download_item.html` | Renders one `<li>` for a file in `downloads/` — prettifies the name and adds an extension badge. Used by `downloads.html`. |
| `window.html` | A draggable "Bem Vindo" popup window (title bar, minimize/close, a YouTube embed). **Dormant** — the markup + `floating-window.js` exist but no page currently includes it. |

---

## 3. Sections of the website

| Page | URL | Layout | What it is |
|------|-----|--------|------------|
| Home | `/` | `home` | **Zine canvas** of floating panels: *Salve Uriel* (ASCII art), *Meus Trem* (link hub + daily splash tagline), *Blog* (latest posts), *Fotos* (→ feed), *Portais* (three recommendation tiles inside the billboard), *Misc*, a joke-telling *caveira anfitriã*, and a hidden *backrooms* doorway below the billboard. |
| Blog | `/blog` | `lista` | Zine-panel list of all `_blog` posts as title links; each post renders via `post`. |
| Feed | `/gram.html` | `post` | **Instagram-like feed** — client-side fetch from PocketBase, with a **search box** (tag/description), carousels, video, and a lightbox. |
| Treino | `/treino.html` | `post` | A structured **workout sheet**; JS clones today's card to the top and reveals exercise demo images on click. |
| Gongo | `/gongo.html` | `home` | "Você e o Gongo" — podcast/video links + an image guide (from `gongo.yml`). |
| Tablaturas | `/tablaturas.html` | `lista` | Guitar tabs (`_tablaturas` collection); each tab renders via `post`. |
| Misc | `/misc.html` | `home` | Launcher grid of zine-panel cards linking to Tablaturas, Flores, Wallpapers. |
| Skate | `/skate.html` | `fotos` | Skate photos & clips (`skate.yml`). |
| Wallpapers | `/wallpapers.html` | `gallery` | Wallpapers the author made (`wallpapers.yml`), in the billboard grid. |
| Flores | `/flores.html` | `gallery` | Hand-drawn flowers, single-column (`flores.yml`). |
| Suspensão | `/suspensao.html` | `gallery` | Body-suspension photos/clips (`suspensao.yml`). |
| Downloads | `/downloads/` | `home` | Auto-generated list of files under `downloads/`, grouped by folder (titles from the page's `groups`) with an "Avulsos" catch-all for loose files. |
| Standup | `/standup.html` | `post` | A standup-comedy video. |
| Backrooms | `/backrooms.html` | *(none)* | A browser **game** — a self-contained ES-module app (see §6). Its own HTML shell, not a Jekyll layout. |
| 404 | `/404.html` | `erro` | Custom not-found page (`404.png`). |

---

## 4. CSS styling choices

Three site stylesheets (plus the game's own `backrooms.css`), no preprocessor of
our own — minima's SCSS is compiled by the theme; our files are plain CSS.

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

### `assets/css/style.css` (global)

Loaded on every page via `head.html`. It is layered by era — older utility
classes sit alongside the newer redesign systems:

- **Atomic / utility classes (legacy):** colors (`.cor1`–`.cor7`, `.turquoise`,
  `.synth-purple`, …), font sizes (`.font10`–`.font25`), widths (`.w25`/`.w50`/
  `.w100`…), alignment helpers, and neon glow boxes. Class names are Portuguese.
- **Page backgrounds:** body classes set fixed, cover background images —
  `.palmtree`, `.skate`, `.take-me-away`, `.erro-404`.
- **Gallery primitives:** `.gallery-grid` (CSS-grid, `--gallery-columns`),
  `.gallery-item`, `.imagem` (`object-fit: cover`), `.thumbnail`, `.gongo-item`.
- **Zine canvas (homepage):** `.zine-canvas` stages absolutely-positioned
  `.zine-panel`s at hand-tuned `top/left/right` + `rotate()` for an off-grid
  collage. `.crooked-header` is the skewed "taped" header strip. The *caveira
  anfitriã*, `#splash-text`, and the *Portais* billboard live here too.
- **Magazine layout (blog / fotos):** `.zine-body` centers a `.magazine-layout`
  "paper" sheet faking an open-magazine center fold; `.magazine-content` flows
  text in **CSS multi-column** newspaper columns.
- **Billboard:** `.billboard` frames `billboard.png`; `.billboard-screen` is
  perspective-warped onto the display hole with a static `matrix3d` fallback
  (JS re-solves it on resize — see §5).
- **Noise overlay:** the `.overlay.noise` grain layer's positioning/animation
  live inline in `noise.html`, not here.
- **Responsive:** a `max-width: 808px` block collapses absolute layouts into a
  centered column, resizes chrome, and drops galleries/columns to fewer columns.

### `assets/css/gram.css` (feed)

Scoped to the photo feed. **Deliberately minimal.** Provides: a responsive
`.gram-feed` grid; the `.gram-search` box; `.gram-carousel` using CSS
**scroll-snap** with `.gram-dots`; circular overlay buttons (`.gram-download`,
`.gram-arrow`); a play-triangle hint on video posters; and a fixed-overlay
`.gram-modal` lightbox.

### `assets/css/treino.css` (workout sheet)

Everything scoped under `.treino`. Reskins the workout page into the zine theme;
the wrapper uses **`column-span: all`** to break out of `.magazine-content`'s
newspaper columns. Recurring motif is the **zine card** = `2px solid #000`
border + `4px 4px 0 #000` hard offset shadow. `.pill`s are sticker badges;
today's cloned card gets a **magenta** offset shadow to read as "this is today".

### `assets/backrooms/css/backrooms.css`

Scoped to the game (`.br-*`). See §6.

---

## 5. JavaScript

All vanilla, no bundler, no dependencies. The site scripts are plain files; the
Backrooms game (§6) is the one place using ES modules. `head.html` loads three
scripts **`defer`** on every page; the rest are page-local.

### Global (loaded everywhere via `head.html`)

| File | What it does |
|------|--------------|
| `random_cursor.js` | On load, randomly swaps the page cursor for one of the `.cur` files (Adventure Time, kunai, …). **Liquid-templated**: a `site.static_files` loop builds the cursor array from `cursors/*.cur` at build time. Add/remove `.cur` files in `cursors/`, don't hand-edit the array. |
| `piada.js` | Injects a random "piada do dia" into `#p-piada` (the caveira host's speech balloon; clicking the host re-rolls). **Liquid-templated** — bakes in `_data/piadas.yml` via `{{ site.data.piadas \| jsonify }}`. |
| `splash.js` | Fills `#splash-text` with a daily-rotating tagline (same for every visitor on a given day, keyed on days-since-epoch; birthday override on May 28). **Liquid-templated** — bakes in `_data/splashes.yml`. |

### Page-local

| File | Page | What it does |
|------|------|--------------|
| `gram.js` | `gram.html` | The **feed renderer**. Fetches from PocketBase (`window.GRAM_PB_URL`), renders single posts and **carousels** (arrows + dots), images and `<video>`, light thumbnails upgrading to full-res in a **modal lightbox**, per-item **download** buttons, client-side **search** (tag/description), and "Carregar mais" pagination. |
| `treino.js` | `treino.html` | Clones the workout card matching the **viewer's local weekday** to a "Hoje —" block at the top; shows a rest-day note on weekends. |
| `treino-images.js` | `treino.html` | Click an exercise name to toggle a demo image (`/assets/img/treino/<slug>.jpg`, from the `<li>`'s `data-ex`). Delegates from `.treino` so it also covers the cloned "Hoje" card. |
| `billboard-screen.js` | via `billboard.html` | Re-solves the `.billboard-screen` perspective **warp** on every resize from scale-independent corner fractions, so it stays pixel-aligned to the billboard hole at any size (the static `matrix3d` in `style.css` is the no-JS fallback). |

### Present but dormant

- `billboard-corner-pin.js` — a **dev tool** (activate with `?pin`) that shows
  draggable corner handles to re-tune the billboard homography; not loaded by
  any page. Use it to regenerate the `FRAC` values in `billboard-screen.js`.
- `floating-window.js` — dependency-free drag/minimize/close chrome for the
  `window.html` "Bem Vindo" popup. Loaded by nothing right now (the include is
  unused), but kept wired to the existing markup contract.

---

## 6. The Backrooms game

A small first-person "escape the backrooms" browser game, kept **entirely
self-contained** under `assets/backrooms/` and reached from a hidden doorway at
the bottom of the homepage (`<a class="backrooms-entry" href="/backrooms">`).

- **Entry HTML:** `backrooms.html` — its own minimal HTML shell (not a Jekyll
  layout), with `<main id="br-game">`, the shared `noise.html` overlay, and
  `<script type="module" src="/assets/backrooms/js/main.js">`.
- **Rendering:** **DOM-based first person**, no canvas/WebGL. Rooms are built as
  `.br-scene` divs; doors and props are `<img>` sprites placed with CSS 3D
  perspective transforms. Styling lives in `assets/backrooms/css/backrooms.css`
  (`--br-wall` backrooms-yellow palette; `.br-door`, `.br-prop`, `.br-person`,
  `.br-hint`, `.br-cue`, `.br-modal`, `.br-win`, minimap `.br-cell`/`.br-link`).

### Architecture

The core is **pure and testable** (deterministic, no DOM/timers); `main.js` is
the wiring layer that binds it to the browser.

| Module | Responsibility |
|--------|----------------|
| `main.js` | Orchestration: boots the game, runs the real-time countdown timer, drives the async dialog/cue/win/lose flows, regenerates the map after a survivable capture, preloads images during the intro, and (in debug) shows a live minimap + skip-to-win. |
| `game.js` | Pure turn engine: `createGame()` + `tick(state, action)` for `move`/`interact`/`talk`/`exit`. Handles room transitions, trap/capture/dread deaths, and sensory cues. |
| `mapgen.js` | Procedural map: spanning tree + extra edges for loops, spawn/exit selection, and content placement (props, clues, hints, traps, one celebrity, entity spawns); plus `layoutVisited()` grid layout for the minimap. |
| `graph.js` | Graph helpers: BFS distances, shortest path/step (drives clue & cue directions), neighbours; `DIRECTIONS`/`RECIPROCAL`/`DELTA` constants. |
| `entities.js` | Entity AI. The lone **wanderer** moves to a random neighbour each turn (oblivious to the player); collision = caught. |
| `render.js` | Builds the first-person scene DOM from state (background, four directional doors incl. trap variants, prop sprites, clickable person, room hint). |
| `content.js` | Single source of truth for narrative content: prop kinds (paintings/lamps/chair/bin), the people pool (3 celebrities), hint/clue templates, the dread ramp, sensory cues, and death taunts. |
| `messages.js` | UI primitives: transient `showCue()` strip and blocking `showDialog()` modal. |
| `mapview.js` | Renders the visited-rooms map for the minimap and win screen. |
| `winscreen.js` | End-of-game overlay: map reveal + escape time + return-home button. |
| `intro.js` | Plays the intro GIF + audio (`nether-portal-*`), advancing when the audio ends (with a fallback timeout). |
| `preload.js` | Fire-and-forget pre-caching of every sprite/background/door image while the intro plays. |
| `rng.js` | Seedable Mulberry32 PRNG + `randInt`/`pick`/`shuffle`. `?seed=<n>` in the URL reproduces a map exactly. |
| `config.js` | All tunable knobs: `ROOM_COUNT` (25), `MAX_DEGREE`, edge ratios, `entities` (one wanderer), `CAPTURE_LIMIT`, `TRAP_ROOM_COUNT`, clue/hint chances, `TIME_LIMIT_MS` (5 min), `WIN_URL`/`LOSE_URL`, `DEBUG`, `SEED`. |

**Mechanics in brief:** reach the exit room to win. Lose by walking into a trap
room, running out the 5-minute real-time timer, examining too many objects
(the "dread" ramp), or being caught by the wanderer (the *first* capture is
survivable — it teleports you to a fresh map — the second is fatal). ~30% of
props carry truthful one-step-toward-exit clues; ~20% of rooms show wall hints
that occasionally lie.

### Tests

The core modules have a **`node --test`** suite (69 tests across 6 files) under
`assets/backrooms/js/tests/`, covering `game`, `mapgen`, `content`, `entities`,
`graph`, and `rng`. `assets/backrooms/js/package.json` (`{"type":"module"}`)
flips that dir into ES-module mode for the runner.

```bash
cd assets/backrooms/js && node --test
```

These are plain Node tests — they need Node (not Ruby/Jekyll), so they can run
on the host or in any Node environment; they don't require the Docker container.
Both the `tests/` dir and its `package.json` are in `_config.yml`'s `exclude:`
so they never ship to `_site/`.

---

## 7. Plugins

Declared in `Gemfile` / `_config.yml`:

- **`jekyll-feed`** — generates the Atom feed at `/feed.xml`.
- **`jekyll-loading-lazy`** — automatically adds `loading="lazy"` to images at
  build time (galleries lean on this).
- **`minima` (~2.5)** — the base theme. Mostly overridden by `style.css`, but it
  still transitively pulls in **`jekyll-seo-tag`** and
  **`jekyll-sass-converter`** (SCSS compilation).
- **`kramdown`** — the Markdown engine for posts/collections.

`webrick`, `logger`, and `bigdecimal` are in the Gemfile to satisfy modern Ruby /
Jekyll-serve runtime needs, not as content plugins.

---

## 8. Integrations & external services

- **PocketBase** (`pics.luccaaugusto.xyz`) — a self-hosted single-binary backend
  (SQLite + auth + admin UI + file storage + REST API) powering the dynamic
  photo feed. The static site fetches it client-side at view time
  (`window.GRAM_PB_URL` in `gram.html`), so posts publish instantly without a
  rebuild. The admin UI is at `pics.luccaaugusto.xyz/_/` (`backend_login_url`);
  `scripts/pb-bulk-import.mjs` seeds it from a folder of media.
- **GitHub Actions → VPS** — `ci.yml` builds with `build.sh` and `rsync`s
  `_site/` over SSH to the web root on every push. ImageMagick is installed in
  CI for thumbnail generation.
- **Embeds** — YouTube (`standup`, and the dormant `window.html` welcome popup),
  Spotify/Deezer (the Gongo podcast episode).
- **Profile / links** — GitHub, Letterboxd, LinkedIn, MyAnimeList, Instagram, a
  Jellyfin media server (`filmes.luccaaugusto.xyz`), and an Amazon wishlist,
  stored in `_config.yml` (mostly `url_*`/`user_*` vars; GitHub is
  `github_username`, the wishlist is `wish_amazon`).
- **Sibling subdomains** — `pds.luccaaugusto.xyz` (Papo de Sauna),
  `dev.luccaaugusto.xyz` (dev portfolio / "meu computador").

---

## 9. Helper scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | Production build: regenerate the `wallpapers`/`flores`/`suspensao` galleries + thumbnails, stamp blog "Atualizado em" dates on changed posts, `jekyll build`, strip `*.sh` from `_site/`. Run by CI. |
| `compress_img.sh <dirs…>` | Flattens PNGs to compressed JPEGs via ImageMagick (`convert`). |
| `css_inutil.sh` | Lists CSS class/id selectors not referenced anywhere in the source (HTML, JS, Markdown, YAML, JSON) — a dead-CSS finder. Warns that dynamically-built names (e.g. `br-door--${dir}`) escape the textual search. |
| `scripts/pb-bulk-import.mjs` | Node helper: each subfolder becomes a post, its files become ordered media, uploaded to PocketBase. |

> Reminder: per [AGENTS.md](../AGENTS.md), run the Jekyll/ImageMagick scripts
> **inside the Docker container**, not on the host. The Backrooms `node --test`
> suite is the exception — it's plain Node and runs anywhere.

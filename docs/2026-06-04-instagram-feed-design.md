# Instagram-like Feed — Design Spec

**Date:** 2026-06-04
**Status:** Approved (design) — implementation not started
**Author context:** Personal Jekyll site (`luccaaugusto.xyz`), static build deployed via GitHub Actions → `rsync` to a self-managed VPS.

---

## 1. Goal

Add an Instagram-like page to the site: upload photos and videos and organize
them as either **single posts** or **carousels** (multiple media in one post).
Posting must be possible from anywhere, including a phone, without a git push or
a site rebuild.

This spec covers the **infrastructure and data model** only. The visual design of
the feed page is intentionally deferred to a later pass.

---

## 2. Key decisions (and why)

| Decision | Choice | Why |
|----------|--------|-----|
| Admin model | **Public, phone-accessible admin** | The author wants to post from a phone without git. A local-only tool (e.g. jekyll-admin) cannot do this. |
| Engine | **PocketBase** (self-hosted) | A single binary providing DB + auth + admin UI + file storage + REST API. Lowest-effort way to get the dynamic pieces a static site can't provide. |
| Hosting | **Subdomain on the existing VPS** (`gram.luccaaugusto.xyz`) | The author already controls the VPS. Keeps the dynamic service separate from the static site. |
| Rendering | **Client-side fetch (dynamic)** | The feed page is static HTML + JS that calls the PocketBase API at view time. New posts appear instantly, with no rebuild/deploy. |
| Data model | **Relational (`posts` + `media`)** | Makes carousels and mixed photo/video first-class, supports explicit ordering, per-item alt text, and video poster frames. |
| Posting UI (initial) | **Built-in PocketBase admin** (`/_/`) | Functional from any browser including mobile. A custom composer is deferred (see §8). |

### Why this is *not* jekyll-admin

`jekyll-admin` is a development-time tool that runs as part of `jekyll serve` on
the author's own machine and edits local files. It does **not** run on the
deployed static site and has no public auth. It can only satisfy "author from my
computer," never "author from my phone on the live site." It is therefore not
used in this design.

### Consequence: the old "upload from my computer when rebuilding" path

Because the feed is dynamic, there is no rebuild step to publish a post. The
author posts the **same way from everywhere** — phone or desktop — through
PocketBase. Seeding existing photos from disk is handled by an optional
bulk-import script (see §4).

---

## 3. Architecture

```
┌─────────────────────────┐        HTTPS (CORS)        ┌──────────────────────────┐
│  luccaaugusto.xyz        │ ─────fetch posts/media───▶ │ gram.luccaaugusto.xyz     │
│  (static Jekyll, rsync)  │                            │ PocketBase (single binary)│
│                          │                            │  • SQLite DB              │
│  /gram page = HTML +     │ ◀────JSON + file URLs────  │  • file storage (pb_data) │
│  JS that renders feed    │                            │  • admin UI at /_/        │
└─────────────────────────┘                            │  • REST API at /api/      │
        ▲ visitor (any browser)                         └──────────────────────────┘
                                                              ▲ author (phone/desktop)
```

- **Jekyll side:** one new static page + a JS file + CSS. Built and deployed by
  the existing `build.sh` / CI with no changes to the pipeline. The page is a
  shell; JS fetches and renders the feed.
- **PocketBase side:** one binary on the VPS, behind nginx + TLS on the
  subdomain. Holds all posts, media files, and the admin UI.
- **Isolation:** if PocketBase is down, only the feed page degrades; the rest of
  the static site is unaffected.

---

## 4. PocketBase deployment

- **Subdomain:** `gram.luccaaugusto.xyz` (final name is the author's call —
  `feed`, `insta`, etc.).
- **Process management:** runs as a `systemd` service (auto-restart, start on
  boot). All state lives in `pb_data/` (SQLite database + uploaded files).
- **Reverse proxy:** nginx proxies the subdomain to PocketBase's port
  (default `8090`), with a Let's Encrypt certificate (certbot).
- **CORS:** PocketBase configured to allow the origin `https://luccaaugusto.xyz`
  so the feed page's `fetch()` calls are permitted.
- **Backups:** PocketBase's built-in scheduled backups (zips `pb_data`), plus a
  cron job that copies the backup off-box (`rsync`/`tar`).
- **Bulk import (optional helper):** a small script using the PocketBase JS SDK
  or `curl` that walks a local folder and batch-creates `posts` + `media` rows.
  Used to seed the feed from existing photos. Not required for launch.

---

## 5. Data model

### `posts`

| field | type | notes |
|-------|------|-------|
| `caption` | text (optional) | post text |
| `published` | date | feed sort key; allows backdating |
| `pinned` | bool (optional) | float a post to the top |
| `created` / `updated` | auto | PocketBase built-ins |

### `media` (each row belongs to one post)

| field | type | notes |
|-------|------|-------|
| `post` | relation → `posts` (single) | parent post |
| `file` | file (single) | the image or video |
| `type` | select: `image` / `video` | set on upload (or inferred from MIME) |
| `order` | number | position within a carousel |
| `alt` | text (optional) | accessibility / per-item caption |
| `poster` | file (optional) | thumbnail frame for a video |

- A **single post** = one `media` row.
- A **carousel** = several `media` rows sharing the same `post`, sorted by `order`.

### Access rules (single-owner)

- `posts` / `media` **list + view** → **public** (anyone can read the feed).
- `posts` / `media` **create / update / delete** → **admin only** (authenticated author).

---

## 6. Feed page (client-side rendering)

- New Jekyll page (e.g. `gram.html`) using the existing layout/styling shell,
  containing a feed container and `assets/js/gram.js`.
- On load, JS calls:
  `GET /api/collections/posts/records?sort=-pinned,-published&expand=media_via_post`
  (back-relation expand syntax `media_via_post` pulls each post's media rows.)
- For each post, JS sorts its media by `order` and renders:
  - **single** → one `<img>` or `<video>`
  - **carousel** → a swipeable/scrollable strip with position dots
- **Media URLs:** `…/api/files/{collectionId}/{recordId}/{filename}`.
  Images can request a resized thumbnail with `?thumb=WIDTHxHEIGHT` (generated
  on demand by PocketBase), so the feed loads light thumbnails and fetches
  full-resolution only on tap/expand.
- **Pagination:** PocketBase returns paged results; JS implements "load more" /
  infinite scroll.
- **Styling deferred:** built minimal/unstyled so it can be skinned into the
  synthwave look later (see the separate synthwave redesign doc).

---

## 7. Video handling

- PocketBase stores videos **as-is** — no server-side transcoding.
  Recommendation: upload web-friendly **H.264 MP4** for universal playback.
- Thumbnails: PocketBase auto-generates them for **images only**. For videos,
  the optional `poster` field on the `media` row holds an uploaded frame; if
  absent, the `<video>` element shows its own first frame.
- Auto-generating video posters (e.g. via an ffmpeg hook) is a possible future
  enhancement, **out of scope** here.

---

## 8. Out of scope (initial build)

- Visual / synthwave styling of the feed page (deferred to the author).
- Custom drag-drop post composer UI. The data model already supports it; the
  built-in PocketBase admin is the initial posting interface. Build the composer
  later if the raw admin is too clunky for carousels.
- Auto video thumbnail generation.
- Social features (likes, comments, followers). This is a personal **display**
  feed, not a social network.

---

## 9. Touchpoints in the existing repo

- **New:** one feed page (`gram.html`), `assets/js/gram.js`, feed CSS.
- **Unchanged:** `build.sh`, CI workflow, existing static galleries
  (`flores`, `wallpapers`, `skate`, …), and the deploy pipeline.
- **New infrastructure (outside the repo):** PocketBase binary + `systemd` unit
  + nginx vhost + TLS cert on the VPS; optional bulk-import script.

---

## 10. Open items to confirm before/while implementing

- Final subdomain name.
- Whether the author wants the optional bulk-import helper in the first pass.
- Confirm the VPS has nginx (or chosen reverse proxy) and certbot available.

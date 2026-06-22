# Instagram-like Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note on testing:** This project has no automated test framework, and much of the work is one-time server ops on a VPS. Each task therefore uses an explicit **Verify** step (exact command + expected output, or a browser check) instead of unit tests. Commit every change that lives in the git repo; server config files live on the VPS and are noted as such.

> **Status (as built):** The **repo-side tasks landed** — `gram.html`,
> `assets/js/gram.js`, `assets/css/gram.css`, and `scripts/pb-bulk-import.mjs`
> all exist on `main` (Tasks 6–8, 12). Note the shipped `gram.html` **diverged
> from Task 6**: it uses `layout: post` (not `gallery`) and drops the
> `.central`/`.main` wrappers — treat [architecture.md](architecture.md) as the
> source of truth for what shipped, not the snippet below. The page also still
> carries its **TEST-DATA mock** block. The **VPS tasks (1–5, 9–11)** — install,
> systemd, nginx/TLS, the collections, deploy, backups — are the author's to run
> and verify on the box; the checkboxes below are unchecked because they track
> that work, not the repo work.

**Goal:** Add a dynamic, Instagram-like photo/video feed (single posts + carousels) to the site, backed by a self-hosted PocketBase instance, rendered client-side so posts publish instantly from any device.

**Architecture:** PocketBase (single binary: SQLite + auth + admin UI + file storage + REST API) runs on the VPS behind nginx+TLS at a subdomain. The existing static Jekyll site gets one new page whose JavaScript fetches posts from the PocketBase REST API at view time and renders them. The static build/deploy pipeline is unchanged.

**Tech Stack:** PocketBase, nginx, certbot/Let's Encrypt, systemd, vanilla JS (`fetch`, no bundler), Jekyll (existing).

**Reference spec:** `docs/2026-06-04-instagram-feed-design.md`

**Conventions used throughout this plan:**
- Subdomain placeholder: `gram.luccaaugusto.xyz` — change consistently if you pick another name.
- PocketBase listens locally on `127.0.0.1:8090`; nginx terminates TLS and proxies to it.
- PocketBase install dir on the VPS: `/opt/pocketbase` (binary + `pb_data/`).

---

## File / artifact map

**In the git repo (committed):**
- Create: `gram.html` — the feed page (Jekyll shell + script tags).
- Create: `assets/js/gram.js` — fetch + render logic (single, carousel, video, pagination).
- Create: `assets/css/gram.css` — minimal layout styling (deliberately plain; skinned later).
- Create: `scripts/pb-bulk-import.mjs` — optional Node helper to seed posts from a folder.
- Modify: site navigation include (e.g. `_includes/head.html` or a nav partial) — add a link to the feed (optional, Task 9).

**On the VPS (not in the repo):**
- `/opt/pocketbase/pocketbase` — the binary.
- `/opt/pocketbase/pb_data/` — database + uploaded media (the entire backup target).
- `/etc/systemd/system/pocketbase.service` — service unit.
- `/etc/nginx/sites-available/gram.luccaaugusto.xyz` — reverse-proxy vhost.
- TLS cert via certbot.

---

## Task 1: Install and run PocketBase on the VPS

**Files (on VPS):** `/opt/pocketbase/pocketbase`, `/opt/pocketbase/pb_data/`

- [ ] **Step 1: Create install dir and a service user**

```bash
sudo mkdir -p /opt/pocketbase
sudo useradd --system --no-create-home --shell /usr/sbin/nologin pocketbase || true
```

- [ ] **Step 2: Download the latest PocketBase release**

```bash
# Check https://github.com/pocketbase/pocketbase/releases for the current version.
PB_VERSION=0.28.2          # <-- set to the latest stable
cd /opt/pocketbase
sudo curl -L -o pocketbase.zip \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
sudo unzip -o pocketbase.zip && sudo rm pocketbase.zip
sudo chown -R pocketbase:pocketbase /opt/pocketbase
```

- [ ] **Step 3: Create the superuser (your login)**

```bash
# Recent PocketBase uses the "superuser" command (older versions: "admin").
sudo -u pocketbase /opt/pocketbase/pocketbase superuser create you@example.com 'a-strong-temporary-password'
```

- [ ] **Step 4: Verify it runs in the foreground**

```bash
sudo -u pocketbase /opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
```

Expected: log line `Server started at http://127.0.0.1:8090` and `REST API: ...` / `Dashboard: http://127.0.0.1:8090/_/`. Press `Ctrl-C` to stop — Task 2 makes it permanent.

---

## Task 2: Run PocketBase as a systemd service

**Files (on VPS):** `/etc/systemd/system/pocketbase.service`

- [ ] **Step 1: Write the unit file**

Create `/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
LimitNOFILE=4096
Restart=always
RestartSec=5s
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Enable and start**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
```

- [ ] **Step 3: Verify**

```bash
systemctl status pocketbase --no-pager
curl -s http://127.0.0.1:8090/api/health
```

Expected: status `active (running)`; the curl returns JSON like `{"code":200,"message":"API is healthy.","data":{...}}`.

---

## Task 3: Reverse proxy + TLS for the subdomain

**Files (on VPS):** `/etc/nginx/sites-available/gram.luccaaugusto.xyz`
**Prereq:** a DNS `A`/`AAAA` record for `gram.luccaaugusto.xyz` → the VPS IP.

- [ ] **Step 1: Write the nginx vhost (HTTP first, certbot adds TLS)**

Create `/etc/nginx/sites-available/gram.luccaaugusto.xyz`:

```nginx
server {
    listen 80;
    server_name gram.luccaaugusto.xyz;

    # Allow large media uploads through the admin UI.
    client_max_body_size 512M;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

- [ ] **Step 2: Enable the site and reload**

```bash
sudo ln -sf /etc/nginx/sites-available/gram.luccaaugusto.xyz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

- [ ] **Step 3: Obtain a TLS certificate**

```bash
sudo certbot --nginx -d gram.luccaaugusto.xyz
```

(Installs the cert and rewrites the vhost to listen on 443 with a 80→443 redirect.)

- [ ] **Step 4: Verify end-to-end**

```bash
curl -s https://gram.luccaaugusto.xyz/api/health
```

Expected: the same healthy JSON as Task 2, now over HTTPS. Also open `https://gram.luccaaugusto.xyz/_/` in a browser — the PocketBase admin login should load.

---

## Task 4: Create the data model (collections + access rules)

**Where:** PocketBase admin UI at `https://gram.luccaaugusto.xyz/_/` (schema is created through the UI; it is stored in `pb_data`, not the git repo).

- [ ] **Step 1: Create the `posts` collection**

New collection → type **Base** → name `posts`. Add fields:
- `caption` — type **Text** (not required).
- `published` — type **Date** (not required; defaults can be set at create time).
- `pinned` — type **Bool** (not required).

(`id`, `created`, `updated` are built-in.)

- [ ] **Step 2: Create the `media` collection**

New collection → type **Base** → name `media`. Add fields:
- `post` — type **Relation** → related collection `posts`, **single** (max select 1), required, cascade delete **on**.
- `file` — type **File**, **single**, required. Allow image and video MIME types (e.g. `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime`). Set a generous max size (e.g. 512 MB).
- `type` — type **Select**, single, values `image`, `video`, required.
- `order` — type **Number**, not required (default 0).
- `alt` — type **Text**, not required.
- `poster` — type **File**, single, not required, image MIME types only.

- [ ] **Step 3: Set public-read access rules on both collections**

For **`posts`** → API Rules:
- **List/Search rule:** leave the field empty and unlocked (no filter) → public read.
- **View rule:** empty and unlocked → public read.
- **Create / Update / Delete rules:** leave **locked** (the lock icon) → superuser-only.

Repeat the exact same rule setup for **`media`** (public List + View; locked Create/Update/Delete).

- [ ] **Step 4: Verify public read returns nothing yet (no auth)**

```bash
curl -s "https://gram.luccaaugusto.xyz/api/collections/posts/records"
```

Expected: `{"page":1,"perPage":30,"totalItems":0,"totalPages":0,"items":[]}` — confirms the endpoint is public (no 403) and empty.

---

## Task 5: Create a test post and confirm the API shape

**Where:** PocketBase admin UI.

- [ ] **Step 1: Create one post with two media (a carousel)**

In `posts`, create a record (set `caption`, set `published` to now). Save and note its `id`.
In `media`, create two records, each with `post` = that id, a `file` uploaded, `type` = `image`, and `order` = `0` then `1`.

- [ ] **Step 2: Verify the feed query returns the post with expanded media**

```bash
curl -s "https://gram.luccaaugusto.xyz/api/collections/posts/records?sort=-pinned,-published&expand=media_via_post" | head -c 1200
```

Expected: one item whose `expand.media_via_post` is an array of two media records, each with `collectionId`, `id`, `file` (filename), `type`, `order`. Note the media `collectionId` value — it confirms the `/api/files/{collectionId}/{recordId}/{filename}` URL shape used in Task 7.

- [ ] **Step 3: Verify a file URL loads**

```bash
# Substitute the collectionId, record id, and filename from Step 2.
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://gram.luccaaugusto.xyz/api/files/<collectionId>/<recordId>/<filename>"
# Thumbnail variant:
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://gram.luccaaugusto.xyz/api/files/<collectionId>/<recordId>/<filename>?thumb=600x0"
```

Expected: `200` for both. The `?thumb=600x0` form returns a 600px-wide generated thumbnail (images only).

---

## Task 6: Add the feed page shell to Jekyll

**Files:** Create `gram.html`, `assets/css/gram.css`

- [ ] **Step 1: Create the page**

Create `gram.html` in the repo root:

```html
---
layout: gallery
title: Feed
---
<link rel="stylesheet" href="/assets/css/gram.css">
<div class="main">
    <div class="central">
        <div class="tcenter">
            <h2>Feed</h2>
        </div>
        <div id="gram-feed" class="gram-feed" aria-live="polite"></div>
        <div class="gram-feed__status" id="gram-status"></div>
        <button id="gram-more" class="gram-more" hidden>Carregar mais</button>
    </div>
</div>
<script>
  // Single source of truth for the PocketBase origin — change if the subdomain changes.
  window.GRAM_PB_URL = "https://gram.luccaaugusto.xyz";
</script>
<script src="/assets/js/gram.js" defer></script>
```

(`layout: gallery` matches the existing lightweight gallery wrapper; swap to another layout later when styling.)

- [ ] **Step 2: Create minimal CSS**

Create `assets/css/gram.css`:

```css
.gram-feed { display: flex; flex-direction: column; gap: 2rem; max-width: 640px; margin: 0 auto; }
.gram-post { width: 100%; }
.gram-post__caption { margin: 0.5rem 0 0; }
.gram-media img, .gram-media video { width: 100%; height: auto; display: block; border-radius: 8px; }
.gram-carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 0.5rem; }
.gram-carousel > * { flex: 0 0 100%; scroll-snap-align: center; }
.gram-dots { display: flex; gap: 6px; justify-content: center; margin-top: 6px; }
.gram-dots button { width: 8px; height: 8px; border-radius: 50%; border: none; padding: 0; background: #bbb; }
.gram-dots button[aria-current="true"] { background: #333; }
.gram-more { display: block; margin: 1.5rem auto; }
.gram-feed__status { text-align: center; opacity: 0.7; }
```

- [ ] **Step 3: Verify the page builds and serves locally**

```bash
docker compose up   # or: bundle exec jekyll serve
```

Open `http://localhost:4000/gram.html`. Expected: the "Feed" heading renders (the feed area is empty until Task 7 wires up JS). No build errors in the Jekyll log.

- [ ] **Step 4: Commit**

```bash
git add gram.html assets/css/gram.css
git commit -m "feat(gram): add Instagram-like feed page shell + base CSS"
```

---

## Task 7: Fetch and render single posts

**Files:** Create `assets/js/gram.js`

- [ ] **Step 1: Write the fetch + render core (single-media posts)**

Create `assets/js/gram.js`:

```js
(() => {
  const PB = window.GRAM_PB_URL;
  const PER_PAGE = 12;
  const feedEl = document.getElementById("gram-feed");
  const statusEl = document.getElementById("gram-status");
  const moreBtn = document.getElementById("gram-more");

  let page = 1;
  let totalPages = 1;

  // Build a file URL for a media/poster record + filename, optional thumbnail size.
  function fileUrl(record, filename, thumb) {
    if (!filename) return null;
    let url = `${PB}/api/files/${record.collectionId}/${record.id}/${filename}`;
    if (thumb) url += `?thumb=${encodeURIComponent(thumb)}`;
    return url;
  }

  function renderImage(m) {
    const a = document.createElement("a");
    a.href = fileUrl(m, m.file);          // full-res on click
    a.target = "_blank";
    a.rel = "noopener";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = fileUrl(m, m.file, "600x0"); // light thumbnail in feed
    img.alt = m.alt || "";
    a.appendChild(img);
    return a;
  }

  // Video rendering is added in Task 8; for now treat everything as an image.
  function renderMedia(m) {
    return renderImage(m);
  }

  function renderPost(post) {
    const media = (post.expand && post.expand.media_via_post) || [];
    media.sort((x, y) => (x.order || 0) - (y.order || 0));

    const article = document.createElement("article");
    article.className = "gram-post";

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "gram-media";
    if (media.length > 0) mediaWrap.appendChild(renderMedia(media[0])); // single for now
    article.appendChild(mediaWrap);

    if (post.caption) {
      const cap = document.createElement("p");
      cap.className = "gram-post__caption";
      cap.textContent = post.caption;
      article.appendChild(cap);
    }
    return article;
  }

  async function loadPage() {
    statusEl.textContent = "Carregando…";
    moreBtn.hidden = true;
    const url = `${PB}/api/collections/posts/records`
      + `?sort=-pinned,-published&expand=media_via_post`
      + `&perPage=${PER_PAGE}&page=${page}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      totalPages = data.totalPages;
      data.items.forEach((post) => feedEl.appendChild(renderPost(post)));
      statusEl.textContent = data.totalItems === 0 ? "Nada por aqui ainda." : "";
      moreBtn.hidden = page >= totalPages;
    } catch (err) {
      statusEl.textContent = "Não consegui carregar o feed.";
      console.error("gram feed:", err);
    }
  }

  moreBtn.addEventListener("click", () => { page += 1; loadPage(); });
  loadPage();
})();
```

- [ ] **Step 2: Verify against live PocketBase**

With the test post from Task 5 in place, open `http://localhost:4000/gram.html`. Expected: the first image of the test post renders; caption shows; if `totalPages` is 1 the "Carregar mais" button stays hidden. Check the browser console for no errors and a successful request to `gram.luccaaugusto.xyz`.

- [ ] **Step 3: Commit**

```bash
git add assets/js/gram.js
git commit -m "feat(gram): fetch posts from PocketBase and render single-media posts"
```

---

## Task 8: Render carousels and videos

**Files:** Modify `assets/js/gram.js`

- [ ] **Step 1: Add video rendering**

Replace the `renderMedia` function in `assets/js/gram.js` with:

```js
  function renderVideo(m) {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    if (m.poster) video.poster = fileUrl(m, m.poster);
    const source = document.createElement("source");
    source.src = fileUrl(m, m.file);
    video.appendChild(source);
    return video;
  }

  function renderMedia(m) {
    return m.type === "video" ? renderVideo(m) : renderImage(m);
  }
```

- [ ] **Step 2: Add carousel rendering**

Replace the `renderPost` function with:

```js
  function renderCarousel(media) {
    const wrap = document.createElement("div");
    wrap.className = "gram-media";

    const track = document.createElement("div");
    track.className = "gram-carousel";
    media.forEach((m) => track.appendChild(renderMedia(m)));
    wrap.appendChild(track);

    const dots = document.createElement("div");
    dots.className = "gram-dots";
    media.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Ir para ${i + 1}`);
      if (i === 0) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", () => {
        track.children[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
      dots.appendChild(dot);
    });
    // Update the active dot as the track scrolls.
    track.addEventListener("scroll", () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      [...dots.children].forEach((d, i) =>
        i === idx ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current"));
    });
    wrap.appendChild(dots);
    return wrap;
  }

  function renderPost(post) {
    const media = (post.expand && post.expand.media_via_post) || [];
    media.sort((x, y) => (x.order || 0) - (y.order || 0));

    const article = document.createElement("article");
    article.className = "gram-post";

    if (media.length > 1) {
      article.appendChild(renderCarousel(media));
    } else if (media.length === 1) {
      const single = document.createElement("div");
      single.className = "gram-media";
      single.appendChild(renderMedia(media[0]));
      article.appendChild(single);
    }

    if (post.caption) {
      const cap = document.createElement("p");
      cap.className = "gram-post__caption";
      cap.textContent = post.caption;
      article.appendChild(cap);
    }
    return article;
  }
```

- [ ] **Step 3: Verify carousel + video**

In the admin UI, add a third `media` row to the test post with a `type=video` MP4 (and optionally a `poster` image), `order=2`. Reload `http://localhost:4000/gram.html`. Expected: a horizontally swipeable carousel with three slides and three dots; the video slide shows controls and plays; the active dot tracks scroll position.

- [ ] **Step 4: Commit**

```bash
git add assets/js/gram.js
git commit -m "feat(gram): render carousels and video media"
```

---

## Task 9: Add a navigation link to the feed (optional)

**Files:** Modify the site nav include (inspect `_includes/head.html` and the layouts to find where existing page links live, e.g. how `wallpapers.html`/`flores.html` are linked).

- [ ] **Step 1: Add the link**

Add an anchor to the feed in the same place other top-level page links appear:

```html
<a href="/gram.html">Feed</a>
```

- [ ] **Step 2: Verify**

Reload the site locally; confirm the "Feed" link appears in the nav and routes to the feed page.

- [ ] **Step 3: Commit**

```bash
git add _includes/head.html   # adjust to the file you edited
git commit -m "feat(gram): link the feed page from site navigation"
```

---

## Task 10: Deploy and verify in production

- [ ] **Step 1: Push to trigger CI**

```bash
git push
```

Expected: the existing GitHub Actions workflow builds and rsyncs `_site/` to the VPS (no pipeline changes were needed — the feed page is just static HTML/JS/CSS).

- [ ] **Step 2: Verify live**

Open `https://luccaaugusto.xyz/gram.html`. Expected: the test post renders, fetched live from `gram.luccaaugusto.xyz`. Confirm in the browser console there are no CORS errors (PocketBase allows cross-origin reads by default; if a CORS error appears, restrict/allow the origin at the nginx layer).

---

## Task 11: Backups

**Where:** PocketBase admin UI + a VPS cron job.

- [ ] **Step 1: Enable PocketBase scheduled backups**

Admin UI → Settings → Backups → enable a cron schedule (e.g. daily). This zips `pb_data` into PocketBase's backups store.

- [ ] **Step 2: Copy backups off-box**

Create `/etc/cron.daily/pocketbase-backup` (or a systemd timer):

```bash
#!/bin/sh
# Snapshot the entire PocketBase state (DB + uploaded media) off the box.
tar czf "/tmp/pb_data-$(date +%F).tgz" -C /opt/pocketbase pb_data
rsync -a "/tmp/pb_data-$(date +%F).tgz" your-backup-host:/backups/pocketbase/
rm -f "/tmp/pb_data-$(date +%F).tgz"
```

```bash
sudo chmod +x /etc/cron.daily/pocketbase-backup
```

- [ ] **Step 3: Verify**

```bash
sudo /etc/cron.daily/pocketbase-backup && echo OK
```

Expected: `OK`, and the dated tarball appears on the backup host.

---

## Task 12: Bulk-import helper from your computer (optional)

**Files:** Create `scripts/pb-bulk-import.mjs`
**Purpose:** Seed the feed from existing photos: each subfolder of an input directory becomes one post; the files inside (sorted by name) become its ordered media. Run from your machine against the live API.

- [ ] **Step 1: Write the script**

Create `scripts/pb-bulk-import.mjs`:

```js
// Usage: PB_URL=https://gram.luccaaugusto.xyz PB_EMAIL=you@x PB_PASS=... \
//        node scripts/pb-bulk-import.mjs ./to-import
// Layout: ./to-import/<post-name>/<files...>  (one folder per post)
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const PB = process.env.PB_URL;
const root = process.argv[2];
if (!PB || !root) { console.error("Set PB_URL and pass a directory."); process.exit(1); }

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const typeFor = (f) => (VIDEO_EXT.has(extname(f).toLowerCase()) ? "video" : "image");

async function authToken() {
  const res = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: process.env.PB_EMAIL, password: process.env.PB_PASS }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  return (await res.json()).token;
}

async function createPost(token, name) {
  const res = await fetch(`${PB}/api/collections/posts/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ caption: name, published: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`post create failed: ${res.status}`);
  return (await res.json()).id;
}

async function createMedia(token, postId, dir, file, order) {
  const buf = await readFile(join(dir, file));
  const form = new FormData();
  form.append("post", postId);
  form.append("type", typeFor(file));
  form.append("order", String(order));
  form.append("file", new Blob([buf]), file);
  const res = await fetch(`${PB}/api/collections/media/records`, {
    method: "POST",
    headers: { Authorization: token },   // do NOT set Content-Type; fetch sets the multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error(`media create failed (${file}): ${res.status}`);
}

const token = await authToken();
for (const entry of await readdir(root)) {
  const dir = join(root, entry);
  if (!(await stat(dir)).isDirectory()) continue;
  const files = (await readdir(dir)).filter((f) => !f.startsWith(".")).sort();
  if (files.length === 0) continue;
  const postId = await createPost(token, basename(entry));
  let order = 0;
  for (const f of files) { await createMedia(token, postId, dir, f, order++); console.log(`+ ${entry}/${f}`); }
}
console.log("done");
```

- [ ] **Step 2: Verify with a tiny sample**

```bash
mkdir -p to-import/sample-post && cp /path/to/two/photos/*.jpg to-import/sample-post/
PB_URL=https://gram.luccaaugusto.xyz PB_EMAIL=you@example.com PB_PASS='...' \
  node scripts/pb-bulk-import.mjs ./to-import
```

Expected: console prints `+ sample-post/<file>` per file then `done`; the new post appears at `https://luccaaugusto.xyz/gram.html` immediately (no rebuild).

- [ ] **Step 3: Commit**

```bash
git add scripts/pb-bulk-import.mjs
git commit -m "feat(gram): add optional bulk-import script for seeding posts"
```

---

## Self-review (completed during planning)

- **Spec coverage:** §3 architecture → Tasks 1–3,6,7,10; §4 deployment → Tasks 1–3,11; §5 data model → Tasks 4–5; §6 rendering → Tasks 6–8; §7 video → Task 8; §8 out-of-scope (composer/auto-posters/social/styling) → intentionally excluded; bulk import (§4) → Task 12; nav → Task 9. No spec requirement is left without a task.
- **Placeholder scan:** no "TBD/handle errors/similar to" placeholders; the only variables are clearly-marked user-specific values (subdomain, PB version, backup host) with instructions.
- **Type/name consistency:** `fileUrl`, `renderImage`, `renderVideo`, `renderMedia`, `renderPost`, `renderCarousel`, `loadPage`, and the `expand.media_via_post` key are used consistently across Tasks 7–8; `window.GRAM_PB_URL` (set in `gram.html`) matches `PB = window.GRAM_PB_URL` in `gram.js`.

---

## Known follow-ups (out of scope here, supported by the model)

- Custom drag-drop post composer page (instead of the built-in admin) for smoother carousel authoring.
- Auto-generating video poster frames (ffmpeg hook in PocketBase).
- Synthwave styling of the feed page (see `docs/2026-06-04-synthwave-canvas-redesign.md` direction).

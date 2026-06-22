(() => {
  const PB = window.GRAM_PB_URL;
  const PER_PAGE = 12;
  const SEARCH_DEBOUNCE_MS = 300;
  const feedEl = document.getElementById("gram-feed");
  const statusEl = document.getElementById("gram-status");
  const searchEl = document.getElementById("gram-search");
  const searchInput = document.getElementById("gram-search-input");
  const searchClear = document.getElementById("gram-search-clear");

  let page = 1;
  let totalPages = 1;
  let query = ""; // current active search term (trimmed)
  let queryGen = 0; // bumped on each new search so stale responses can be ignored

  // Build a file URL for a media/poster record + filename, optional thumbnail size.
  function fileUrl(record, filename, thumb) {
    if (!filename) return null;
    // Already an absolute URL (external/mock media) — use as-is.
    if (/^https?:\/\//.test(filename)) return filename;
    let url = `${PB}/api/files/${record.collectionId}/${record.id}/${filename}`;
    if (thumb) url += `?thumb=${encodeURIComponent(thumb)}`;
    return url;
  }

  // Derive a sensible download filename from a media record.
  function mediaName(m) {
    const f = m.file || "";
    if (/^https?:\/\//.test(f)) {
      try {
        return decodeURIComponent(new URL(f).pathname.split("/").pop()) || "";
      } catch (e) {
        return "";
      }
    }
    return f;
  }

  // Force a download. Fetches the file as a blob (works cross-origin only if the
  // server sends CORS headers); falls back to opening it in a new tab if blocked.
  async function downloadFile(url, name) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = name || "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.warn("gram download — falling back to new tab:", err);
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  // A small download button overlaid on a media item.
  function downloadButton(url, name) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gram-download";
    btn.setAttribute("aria-label", "Baixar");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadFile(url, name);
    });
    return btn;
  }

  function renderImage(m, withDownload) {
    const item = document.createElement("div");
    item.className = "gram-media__item";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = fileUrl(m, m.file, "600x0"); // light thumbnail in the feed
    img.dataset.thumb = img.src;
    img.dataset.full = fileUrl(m, m.file); // full-res once the post is expanded
    img.alt = m.alt || "";
    item.appendChild(img);
    // Download button lives only in the expanded modal, not in the feed.
    if (withDownload) item.appendChild(downloadButton(img.dataset.full, mediaName(m)));
    return item;
  }

  function renderVideo(m, withDownload) {
    const item = document.createElement("div");
    item.className = "gram-media__item gram-media__item--video";
    const video = document.createElement("video");
    video.preload = "metadata"; // first frame only; controls added on expand
    video.playsInline = true;
    const source = document.createElement("source");
    source.src = fileUrl(m, m.file);
    video.appendChild(source);
    item.appendChild(video);
    if (withDownload) item.appendChild(downloadButton(fileUrl(m, m.file), mediaName(m)));
    return item;
  }

  function renderMedia(m, withDownload) {
    return m.type === "video"
      ? renderVideo(m, withDownload)
      : renderImage(m, withDownload);
  }

  const CHEVRON = { prev: "m15 18-6-6 6-6", next: "m9 18 6-6-6-6" };

  function renderCarousel(media, withDownload) {
    const wrap = document.createElement("div");
    wrap.className = "gram-media";

    const track = document.createElement("div");
    track.className = "gram-carousel";
    media.forEach((m) => track.appendChild(renderMedia(m, withDownload)));
    wrap.appendChild(track);

    const currentIndex = () => Math.round(track.scrollLeft / track.clientWidth);
    const goTo = (i) => {
      const idx = Math.max(0, Math.min(media.length - 1, i));
      track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
    };

    // Prev / next arrow buttons.
    const arrow = (dir, label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `gram-arrow gram-arrow--${dir}`;
      btn.setAttribute("aria-label", label);
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
        ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        `<path d="${CHEVRON[dir]}"/></svg>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(currentIndex() + (dir === "next" ? 1 : -1));
      });
      return btn;
    };
    wrap.appendChild(arrow("prev", "Anterior"));
    wrap.appendChild(arrow("next", "Próximo"));

    const dots = document.createElement("div");
    dots.className = "gram-dots";
    media.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Ir para ${i + 1}`);
      if (i === 0) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(i);
      });
      dots.appendChild(dot);
    });
    // Update the active dot as the track scrolls.
    track.addEventListener("scroll", () => {
      const idx = currentIndex();
      [...dots.children].forEach((d, i) =>
        i === idx
          ? d.setAttribute("aria-current", "true")
          : d.removeAttribute("aria-current"),
      );
    });
    wrap.appendChild(dots);
    return wrap;
  }

  // Render a post's media (single item or carousel) into a fresh container.
  // Download buttons are added only when withDownload is set (the modal view).
  function renderPostMedia(media, withDownload) {
    if (media.length > 1) return renderCarousel(media, withDownload);
    if (media.length === 1) {
      const single = document.createElement("div");
      single.className = "gram-media";
      single.appendChild(renderMedia(media[0], withDownload));
      return single;
    }
    return null;
  }

  // The flat `posts` schema has no per-file metadata, so infer video from the
  // file extension; everything else is treated as an image.
  const VIDEO_EXTENSIONS = [
    "mp4",
    "m4v",
    "mov",
    "webm",
    "ogv",
    "ogg",
    "avi",
    "mkv",
    "3gp",
  ];

  // Turn a post's `media` filename array into render objects. Each carries the
  // post's collectionId/id so fileUrl() can build the file endpoint. Carousel
  // order is simply the order of the files in the array.
  function normalizeMedia(post) {
    return (post.media || []).map((filename) => {
      const split_name = filename.split(".");
      const extension = split_name.length > 1 ? split_name[1] : null;
      return {
        collectionId: post.collectionId,
        id: post.id,
        file: filename,
        type: VIDEO_EXTENSIONS.includes(extension) ? "video" : "image",
      };
    });
  }

  function renderPost(post) {
    const media = normalizeMedia(post);

    const article = document.createElement("article");
    article.className = "gram-post";

    const mediaEl = renderPostMedia(media);
    if (mediaEl) article.appendChild(mediaEl);

    // The caption is shown only in the expanded modal, never inline in the feed.
    // Click a post to open it in the modal; ignore clicks on interactive controls.
    article.addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      openModal(media, post.description);
    });
    return article;
  }

  // ---- modal / lightbox ----------------------------------------------------
  const modal = document.createElement("div");
  modal.className = "gram-modal";
  modal.hidden = true;
  const modalBody = document.createElement("div");
  modalBody.className = "gram-modal__body";
  const modalDialog = document.createElement("div");
  modalDialog.className = "gram-modal__dialog";
  modalDialog.appendChild(modalBody);
  const modalClose = document.createElement("button");
  modalClose.type = "button";
  modalClose.className = "gram-close gram-modal__close";
  modalClose.setAttribute("aria-label", "Fechar");
  modalClose.textContent = "×";
  modalClose.addEventListener("click", closeModal);
  modal.appendChild(modalClose);
  modal.appendChild(modalDialog);
  // Click on the dimmed backdrop (but not the dialog) closes the modal.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.body.appendChild(modal);

  function openModal(media, caption) {
    modalBody.innerHTML = "";
    const mediaEl = renderPostMedia(media, true); // download buttons only in the modal
    if (mediaEl) {
      // Full-res images and playable videos in the expanded view.
      mediaEl.querySelectorAll("img[data-full]").forEach((img) => {
        img.src = img.dataset.full;
      });
      mediaEl.querySelectorAll("video").forEach((v) => {
        v.controls = true;
      });
      modalBody.appendChild(mediaEl);
    }
    if (caption) {
      const cap = document.createElement("p");
      cap.className = "gram-post__caption";
      cap.textContent = caption;
      modalBody.appendChild(cap);
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden"; // freeze the feed behind the modal
    modalClose.focus();
  }

  function closeModal() {
    modalBody.querySelectorAll("video").forEach((v) => v.pause());
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
  }

  // ---- feed loading + infinite scroll --------------------------------------
  let loading = false;
  let sentinelVisible = false;

  // Escape a user term for safe inclusion in a PocketBase filter string literal,
  // so a stray quote/backslash can't break the expression.
  function escapeFilter(s) {
    return s.replace(/[\\']/g, "\\$&");
  }

  // Build the records endpoint for the current page, adding a tag/description
  // filter when there's an active search term.
  function buildUrl() {
    let url =
      `${PB}/api/collections/posts/records` +
      `?sort=-pinned,-created` +
      `&perPage=${PER_PAGE}&page=${page}`;
    if (query) {
      const q = escapeFilter(query);
      const filter = `(description~'${q}' || tag~'${q}')`;
      url += `&filter=${encodeURIComponent(filter)}`;
    }
    return url;
  }

  async function loadPage() {
    if (loading) return;
    loading = true;
    const gen = queryGen; // snapshot — a new search invalidates this request
    statusEl.textContent = "Carregando…";
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (gen !== queryGen) return; // superseded by a newer search; the active request owns state
      totalPages = data.totalPages;
      data.items.forEach((post) => feedEl.appendChild(renderPost(post)));
      statusEl.textContent =
        data.totalItems === 0
          ? query
            ? `Nada encontrado para “${query}”.`
            : "Nada por aqui ainda."
          : "";
      loading = false;
      maybeLoadMore(); // keep filling while the sentinel stays on-screen
    } catch (err) {
      if (gen !== queryGen) return; // stale failure — don't clobber the active request
      statusEl.textContent = "Não consegui carregar o feed.";
      console.error("gram feed:", err);
      loading = false;
    }
  }

  // Switch to a new search term (or clear it). Resets pagination, drops any
  // in-flight request via queryGen, and reloads the feed from page 1.
  function runSearch(term) {
    const next = term.trim();
    if (next === query) return;
    query = next;
    queryGen += 1;
    page = 1;
    totalPages = 1;
    loading = false; // release the guard so the in-flight request can be superseded
    feedEl.innerHTML = "";
    loadPage();
  }

  // Load the next page if there is one and the bottom sentinel is near view.
  function maybeLoadMore() {
    if (!loading && sentinelVisible && page < totalPages) {
      page += 1;
      loadPage();
    }
  }

  // Infinite scroll: watch the status element at the end of the feed and pull
  // the next page as it approaches the viewport.
  const sentinel = new IntersectionObserver(
    (entries) => {
      sentinelVisible = entries.some((e) => e.isIntersecting);
      maybeLoadMore();
    },
    { rootMargin: "600px 0px" },
  );
  sentinel.observe(statusEl);

  // ---- search wiring -------------------------------------------------------
  if (searchInput) {
    let debounceTimer = null;

    searchInput.addEventListener("input", () => {
      searchClear.hidden = searchInput.value === "";
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(
        () => runSearch(searchInput.value),
        SEARCH_DEBOUNCE_MS,
      );
    });

    // Enter fires the search immediately, bypassing the debounce.
    searchEl.addEventListener("submit", (e) => {
      e.preventDefault();
      clearTimeout(debounceTimer);
      runSearch(searchInput.value);
    });

    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.hidden = true;
      clearTimeout(debounceTimer);
      runSearch("");
      searchInput.focus();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.hidden) {
      closeModal();
    } else if (searchInput && document.activeElement === searchInput && searchInput.value) {
      searchInput.value = "";
      searchClear.hidden = true;
      runSearch("");
    }
  });
  loadPage();
})();

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
      try { return decodeURIComponent(new URL(f).pathname.split("/").pop()) || ""; }
      catch (e) { return ""; }
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
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
    btn.addEventListener("click", (e) => { e.stopPropagation(); downloadFile(url, name); });
    return btn;
  }

  function renderImage(m) {
    const item = document.createElement("div");
    item.className = "gram-media__item";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = fileUrl(m, m.file, "600x0"); // light thumbnail in the feed
    img.dataset.thumb = img.src;
    img.dataset.full = fileUrl(m, m.file); // full-res once the post is expanded
    img.alt = m.alt || "";
    item.appendChild(img);
    item.appendChild(downloadButton(img.dataset.full, mediaName(m)));
    return item;
  }

  function renderVideo(m) {
    const item = document.createElement("div");
    item.className = "gram-media__item gram-media__item--video";
    const video = document.createElement("video");
    video.preload = "metadata";   // poster/first frame only; controls added on expand
    video.playsInline = true;
    if (m.poster) video.poster = fileUrl(m, m.poster);
    const source = document.createElement("source");
    source.src = fileUrl(m, m.file);
    video.appendChild(source);
    item.appendChild(video);
    item.appendChild(downloadButton(fileUrl(m, m.file), mediaName(m)));
    return item;
  }

  function renderMedia(m) {
    return m.type === "video" ? renderVideo(m) : renderImage(m);
  }

  const CHEVRON = { prev: "m15 18-6-6 6-6", next: "m9 18 6-6-6-6" };

  function renderCarousel(media) {
    const wrap = document.createElement("div");
    wrap.className = "gram-media";

    const track = document.createElement("div");
    track.className = "gram-carousel";
    media.forEach((m) => track.appendChild(renderMedia(m)));
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
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
        + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + `<path d="${CHEVRON[dir]}"/></svg>`;
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
      dot.addEventListener("click", (e) => { e.stopPropagation(); goTo(i); });
      dots.appendChild(dot);
    });
    // Update the active dot as the track scrolls.
    track.addEventListener("scroll", () => {
      const idx = currentIndex();
      [...dots.children].forEach((d, i) =>
        i === idx ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current"));
    });
    wrap.appendChild(dots);
    return wrap;
  }

  // Render a post's media (single item or carousel) into a fresh container.
  function renderPostMedia(media) {
    if (media.length > 1) return renderCarousel(media);
    if (media.length === 1) {
      const single = document.createElement("div");
      single.className = "gram-media";
      single.appendChild(renderMedia(media[0]));
      return single;
    }
    return null;
  }

  function renderPost(post) {
    const media = (post.expand && post.expand.media_via_post) || [];
    media.sort((x, y) => (x.order || 0) - (y.order || 0));

    const article = document.createElement("article");
    article.className = "gram-post";

    const mediaEl = renderPostMedia(media);
    if (mediaEl) article.appendChild(mediaEl);

    if (post.caption) {
      const cap = document.createElement("p");
      cap.className = "gram-post__caption";
      cap.textContent = post.caption;
      article.appendChild(cap);
    }

    // Click a post to open it in the modal; ignore clicks on interactive controls.
    article.addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      openModal(media, post.caption);
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
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.body.appendChild(modal);

  function openModal(media, caption) {
    modalBody.innerHTML = "";
    const mediaEl = renderPostMedia(media);
    if (mediaEl) {
      // Full-res images and playable videos in the expanded view.
      mediaEl.querySelectorAll("img[data-full]").forEach((img) => { img.src = img.dataset.full; });
      mediaEl.querySelectorAll("video").forEach((v) => { v.controls = true; });
      modalBody.appendChild(mediaEl);
    }
    if (caption) {
      const cap = document.createElement("p");
      cap.className = "gram-post__caption";
      cap.textContent = caption;
      modalBody.appendChild(cap);
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";   // freeze the feed behind the modal
    modalClose.focus();
  }

  function closeModal() {
    modalBody.querySelectorAll("video").forEach((v) => v.pause());
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
  loadPage();
})();

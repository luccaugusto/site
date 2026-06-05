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

  function renderImage(m) {
    const a = document.createElement("a");
    a.href = fileUrl(m, m.file);          // full-res on click
    a.target = "_blank";
    a.rel = "noopener";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = fileUrl(m, m.file, "600x0"); // light thumbnail in the feed
    img.alt = m.alt || "";
    a.appendChild(img);
    return a;
  }

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

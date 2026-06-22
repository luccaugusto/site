// Exercise images: click an exercise name to reveal a demo picture below it,
// click again to hide. Works for both the "Semana" cards and the cloned
// "Hoje" card (treino.js clones it first; we delegate from .treino so new
// nodes are covered either way). Images live in /assets/img/treino/<slug>.jpg
// where <slug> is the li's data-ex attribute.
(() => {
  const root = document.querySelector(".treino");
  if (!root) return;
  const BASE = "/assets/img/treino/";

  const toggle = (li) => {
    const open = li.classList.toggle("open");
    li.setAttribute("aria-expanded", open ? "true" : "false");
    let fig = li.querySelector(":scope > .ex-img");
    if (open && !fig) {
      fig = document.createElement("span");
      fig.className = "ex-img";
      const img = document.createElement("img");
      img.src = BASE + li.dataset.ex + ".jpg";
      img.alt = "Demonstracao: " + li.textContent.trim();
      img.loading = "lazy";
      fig.appendChild(img);
      li.appendChild(fig);
    }
  };

  // Make the exercise items behave like buttons (focusable + keyboard).
  root.querySelectorAll("li[data-ex]").forEach((li) => {
    if (li.dataset.enhanced) return;
    li.dataset.enhanced = "1";
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-expanded", "false");
  });

  root.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-ex]");
    if (!li || !root.contains(li)) return;
    if (e.target.closest(".ex-img")) return; // clicking the picture shouldn't close it
    toggle(li);
  });

  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const li = e.target.closest("li[data-ex]");
    if (!li) return;
    e.preventDefault();
    toggle(li);
  });
})();

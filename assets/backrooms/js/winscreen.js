import { buildMapEl } from "./mapview.js";
import { WIN_TEXT } from "./content.js";

// "4:07" / "0:42" — mm:ss, clamped to non-negative.
function formatEscapeTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function showWinScreen(state, config, escapeMs = null) {
  // DEBUG reveals the whole map; otherwise only the rooms the player actually visited.
  const reveal = config.DEBUG
    ? new Set(state.rooms.map((r) => r.id))
    : state.visited;

  const overlay = document.createElement("div");
  overlay.className = "br-win";
  const h = document.createElement("h1");
  h.textContent = "É um alivio, pelo desejo do acaso você se safou dessa.";
  const p = document.createElement("p");
  p.textContent = WIN_TEXT;

  let time = null;
  if (escapeMs !== null) {
    time = document.createElement("p");
    time.className = "br-win__time";
    time.textContent = `Você escapou em ${formatEscapeTime(escapeMs)}`;
  }

  const map = buildMapEl(state, {
    reveal,
    width: 504,
    height: 404,
    pad: 28,
    here: null,
    markEnds: true,
  });

  const btn = document.createElement("button");
  btn.textContent = "Sair";
  btn.addEventListener("click", () => {
    location.href = config.WIN_URL;
  });

  overlay.append(h, p, ...(time ? [time] : []), map, btn);
  document.body.append(overlay);
}

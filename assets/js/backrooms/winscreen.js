import { buildMapEl } from "./mapview.js";
import { WIN_TEXT } from "./content.js";

export function showWinScreen(state, config) {
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

  overlay.append(h, p, map, btn);
  document.body.append(overlay);
}

import { DIRECTIONS } from "./graph.js";
import { PROP_EMOJI, DIR_PT, personById } from "./content.js";

// Sprite registry seam: register a URL for a kind to swap the emoji for an <img>.
const SPRITES = Object.create(null); // e.g. SPRITES['prop:lampada'] = '/assets/backrooms/lamp.png'
export function registerSprite(key, url) {
  SPRITES[key] = url;
}

export function resolveVisual(key, fallbackEmoji) {
  if (SPRITES[key]) {
    const img = document.createElement("img");
    img.src = SPRITES[key];
    img.alt = key;
    img.className = "br-sprite";
    return img;
  }
  const span = document.createElement("span");
  span.textContent = fallbackEmoji;
  return span;
}

// Hand-tuned prop anchor positions (cycled through as a room gets more props).
// `side` angles the prop toward its side wall (see .br-prop--left/right in CSS).
const PROP_SPOTS = [
  { left: "24%", top: "58%", side: "left" },
  { left: "68%", top: "60%", side: "right" },
  { left: "14%", top: "40%", side: "left" },
  { left: "80%", top: "42%", side: "right" },
];

export function renderRoom(root, state, onAction) {
  const room = state.rooms[state.playerRoom];
  root.innerHTML = "";

  // The scene backdrop (walls/floor/ceiling) is a single photographic background
  // set in CSS on .br-scene; props, doors, hints and people layer on top.
  const scene = document.createElement("div");
  scene.className = "br-scene";

  // Doors
  for (const dir of DIRECTIONS) {
    if (room.doors[dir] === undefined) continue;
    const isExitDoor = state.rooms[room.doors[dir]].isExit;
    const door = el(
      "button",
      `br-door br-door--${dir}` + (isExitDoor ? " br-door--exit" : ""),
    );
    door.textContent = isExitDoor ? "SAÍDA" : DIR_PT[dir].toUpperCase();
    door.addEventListener("click", () => onAction({ type: "move", dir }));
    scene.append(door);
  }

  // Exit door (special) when standing IN the exit room.
  if (room.isExit) {
    const ex = el("button", "br-door br-door--ahead br-door--exit");
    ex.textContent = "SAÍDA";
    ex.addEventListener("click", () => onAction({ type: "exit" }));
    scene.append(ex);
  }

  // Props
  room.props.forEach((p, i) => {
    const spot = PROP_SPOTS[i % PROP_SPOTS.length];
    const node = resolveVisual(`prop:${p.kind}`, PROP_EMOJI[p.kind] || "❔");
    node.classList.add("br-prop", `br-prop--${spot.side}`);
    node.style.left = spot.left;
    node.style.top = spot.top;
    node.title = p.kind;
    node.addEventListener("click", () =>
      onAction({ type: "interact", propId: p.id }),
    );
    scene.append(node);
  });

  // Person entity (harmless celebrity) — click to read their lore.
  if (room.person) {
    const def = personById(room.person.kind);
    if (def) {
      const fig = document.createElement("img");
      fig.src = def.image;
      fig.alt = def.name;
      fig.className = "br-person";
      fig.title = def.name;
      fig.addEventListener("click", () => onAction({ type: "talk" }));
      scene.append(fig);
    }
  }

  // Hint
  if (room.hint) {
    const h = el("div", "br-hint");
    h.textContent = room.hint.text;
    scene.append(h);
  }

  root.append(scene);
}

function el(tag, className) {
  const n = document.createElement(tag);
  n.className = className;
  return n;
}

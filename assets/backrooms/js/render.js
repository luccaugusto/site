import { DIRECTIONS } from "./graph.js";
import { PROP_EMOJI, DIR_PT, personById, resolvePropPlacement } from "./content.js";

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

  // Props — each kind owns its placement/transform (see content.PROP_STYLES).
  // Pre-count kinds so same-kind duplicates in this room fan out instead of stacking.
  const kindCounts = {};
  for (const p of room.props) kindCounts[p.kind] = (kindCounts[p.kind] || 0) + 1;
  const kindSeen = {};
  room.props.forEach((p) => {
    const dupIndex = kindSeen[p.kind] || 0;
    kindSeen[p.kind] = dupIndex + 1;
    const place = resolvePropPlacement(p.kind, p.id, dupIndex, kindCounts[p.kind]);
    const node = resolveVisual(`prop:${p.kind}`, PROP_EMOJI[p.kind] || "❔");
    node.classList.add("br-prop", `br-prop--${p.kind}`);
    node.style.left = place.left;
    node.style.top = place.top;
    node.style.setProperty("--br-prop-tf", place.transform);
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

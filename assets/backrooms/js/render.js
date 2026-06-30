import { DIRECTIONS } from "./graph.js";
import { DIR_PT, personById, placeRoomProps } from "./content.js";

// Sprite registry seam: register a URL for a kind to render it as an <img>.
const SPRITES = Object.create(null); // e.g. SPRITES['prop:lampada_acesa'] = '/assets/backrooms/images/lamp-on.png'
export function registerSprite(key, url) {
  SPRITES[key] = url;
}

// Every prop kind is sprite-backed (see content.PROP_SPRITES), so the <img>
// branch is the live path. The empty-span fallback is just a defensive no-op
// for an unregistered key — broken images degrade to their alt text.
export function resolveVisual(key) {
  if (SPRITES[key]) {
    const img = document.createElement("img");
    img.src = SPRITES[key];
    img.alt = key;
    img.className = "br-sprite";
    return img;
  }
  return document.createElement("span");
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
    const target = state.rooms[room.doors[dir]];
    const isExitDoor = target.isExit;
    // Doors into trap rooms wear a distinct silhouette — a fair "tell" the wary
    // player can learn to read. Traps never coincide with the exit (see mapgen),
    // so these two flavors never collide on one door.
    const isTrapDoor = !!target.trap;
    const door = el(
      "button",
      `br-door br-door--${dir}` +
        (isExitDoor ? " br-door--exit" : "") +
        (isTrapDoor ? " br-door--trap" : ""),
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

  // Props — placement (incl. same-kind fan-out and lamp-toggle stability) is
  // resolved by content.placeRoomProps; each kind owns its base style/transform.
  for (const place of placeRoomProps(room.props)) {
    const node = resolveVisual(`prop:${place.kind}`);
    node.classList.add("br-prop", `br-prop--${place.kind}`);
    node.style.left = place.left;
    node.style.top = place.top;
    node.style.setProperty("--br-prop-tf", place.transform);
    node.title = place.kind;
    node.addEventListener("click", () =>
      onAction({ type: "interact", propId: place.id }),
    );
    scene.append(node);
  }

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

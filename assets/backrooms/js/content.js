export const DIR_PT = {
  ahead: "frente",
  back: "tras",
  left: "esquerda",
  right: "direita",
};

export const PROP_KINDS = [
  "quadro_1",
  "quadro_2",
  "quadro_3",
  "quadro_4",
  "lampada_acesa",
  "lampada_apagada",
  "cadeira",
  "lixeira",
];
// Emoji fallback per prop kind — shown by render.resolveVisual only when no sprite
// is registered for the kind. Quadros and lamps are normally sprite-backed (see
// QUADRO_SPRITES / LAMP_SPRITES), so their emoji only appears if an image fails.
export const PROP_EMOJI = {
  quadro_1: "🖼️",
  quadro_2: "🖼️",
  quadro_3: "🖼️",
  quadro_4: "🖼️",
  lampada_acesa: "💡",
  lampada_apagada: "💡",
  cadeira: "🪑",
  lixeira: "🗑️",
};

// Per-prop placement + transform. Single source of truth for where each kind
// sits in the first-person scene and whether it gets the side-wall perspective.
// Quadros hang high on the angled side walls; lamps sit face-on at mid-height;
// floor clutter sits lower and flat. left/top are % into .br-scene.
export const PROP_DEFAULT = { left: "50%", top: "50%", transform: "none" };
export const PROP_STYLES = {
  // Paintings hung on the side walls — angled to match the doorway perspective.
  quadro_1: {
    left: "18%",
    top: "30%",
    transform: "perspective(400px) rotateY(50deg)",
  },
  quadro_2: {
    left: "70%",
    top: "28%",
    transform: "perspective(400px) rotateY(-50deg)",
  },
  quadro_3: {
    left: "16%",
    top: "34%",
    transform: "perspective(400px) rotateY(50deg)",
  },
  quadro_4: {
    left: "78%",
    top: "32%",
    transform: "perspective(400px) rotateY(-50deg)",
  },
  // Lamps — face-on, no perspective, mid-height.
  lampada_acesa: { left: "50%", top: "50%", transform: "none" },
  lampada_apagada: { left: "50%", top: "50%", transform: "none" },
  // Floor clutter — lower in the frame, flat.
  cadeira: { left: "30%", top: "60%", transform: "none" },
  lixeira: { left: "72%", top: "62%", transform: "none" },
  espelho: { left: "50%", top: "40%", transform: "none" },
  mancha: { left: "46%", top: "78%", transform: "none" },
};

// Horizontal fan-out for same-kind duplicates in one room, so they don't stack.
const LANE_STEP = 16; // % between same-kind lanes
const JITTER_MAX = 5; // ± % organic jitter, derived from the prop id
const LEFT_MIN = 4,
  LEFT_MAX = 92;

// FNV-1a hash → a stable pseudo-random number from the prop's id.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Resolve a prop's final placement. A lone prop sits exactly on its base style.
// When a room holds several of the same kind, each is fanned out horizontally:
// an even lane offset by dupIndex (0, +Δ, −Δ, +2Δ, …) guarantees no collision,
// plus a small id-derived jitter so the layout reads as organic. Deterministic
// on purpose — rooms re-render every move, so Math.random() would make props
// jump around the screen.
export function resolvePropPlacement(kind, id, dupIndex, dupCount) {
  const base = PROP_STYLES[kind] || PROP_DEFAULT;
  if (dupCount <= 1) return { ...base };
  const magnitude = Math.ceil(dupIndex / 2);
  const sign = dupIndex % 2 === 1 ? 1 : -1;
  const lane = sign * magnitude * LANE_STEP;
  const jitter = (((hashStr(id) % 1001) / 1000) * 2 - 1) * JITTER_MAX;
  const left = Math.min(
    LEFT_MAX,
    Math.max(LEFT_MIN, parseFloat(base.left) + lane + jitter),
  );
  return {
    left: `${Math.round(left * 10) / 10}%`,
    top: base.top,
    transform: base.transform,
  };
}

// Each quadro_N prop kind shows a real painting hung on the wall (registered as
// a sprite at startup; see main.js + render.js resolveVisual).
export const QUADRO_SPRITES = {
  quadro_1: "/assets/backrooms/images/quadro-monociclo.jpg",
  quadro_2: "/assets/backrooms/images/quadro-creeper.jpg",
  quadro_3: "/assets/backrooms/images/quadro-caveira.jpg",
  quadro_4: "/assets/backrooms/images/quadro-karate.jpg",
};
// The two lamp prop kinds are sprite-backed like the quadros (registered at
// startup; see main.js). A lamp is generated on or off at random; clicking it
// flips it to the opposite variant (see toggleLamp + game.tick's `interact`).
export const LAMP_SPRITES = {
  lampada_acesa: "/assets/backrooms/images/lamp-on.png",
  lampada_apagada: "/assets/backrooms/images/lamp-off.png",
};
// Furniture props are sprite-backed like the quadros and lamps (registered at
// startup; see main.js). Their PROP_EMOJI entries only show if the image fails.
export const FURNITURE_SPRITES = {
  cadeira: "/assets/backrooms/images/chair.png",
  lixeira: "/assets/backrooms/images/bin.png",
};
// Returns the opposite lamp kind for a lamp, or null when `kind` is not a lamp.
// Doubles as the "is this prop a lamp?" predicate.
export function toggleLamp(kind) {
  if (kind === "lampada_acesa") return "lampada_apagada";
  if (kind === "lampada_apagada") return "lampada_acesa";
  return null;
}
export const ENTITY_EMOJI = {
  hunter: "🫥",
  sprinter: "🏃",
  wanderer: "👁️",
  stalker: "🕴️",
};

// People entities: harmless celebrities who linger in one room. One is picked
// per map (see mapgen). Clicking one reads its `text` in a dialog with `image`.
export const PEOPLE = [
  {
    id: "davi-brito",
    name: "Davi Brito",
    image: "/assets/backrooms/images/davi-brito.png",
    text: 'Você encontrou Davi Brito, o grande ex BBB, depois de várias tentativas frustradas em carreiras diferentes ele encontrou sua vocação, corretor de salas nas backrooms. "Os preços estão imperdíveis, Calabreso" ele diz para você',
  },
  {
    id: "nicolas-cage",
    name: "Nicolas Cage",
    image: "/assets/backrooms/images/nicolas-cage.png",
    text: "Você encontrou Nicolas Cage em total dedicação a seu papel no novo filme. O silêncio das backrooms proporciona o ambiente ideal para ensaiar suas falas cringe sem julgamentos.",
  },
  {
    id: "ronaldinho-gaucho",
    name: "Ronaldinho Gaúcho",
    image: "/assets/backrooms/images/ronaldinho-gaucho.png",
    text: "Você trombou o Bruxo em um de seus rolês mais aleatórios. Uma lenda!",
  },
];
export function personById(id) {
  return PEOPLE.find((p) => p.id === id);
}

export const HINT_TRUTHFUL = [
  "{dir}",
  "vai pra {dir}, eles estão tentando te enganar",
  "confia: {dir}",
];
export const HINT_DECEPTIVE = [
  "Atenção visitantes e funcionários, saída a {dir}.",
  "Equipe de exploração, o caminho pra casa é pra {dir}!",
  "A gerência adverte: evite se perder, siga para {dir}.",
];
export function fillHint(template, dir) {
  return template.replaceAll("{dir}", DIR_PT[dir]);
}

// Prop clues — the honest counterpart to wall hints. A prop clue NEVER lies: it
// always points toward the real exit. The direction is resolved at map-generation
// (see mapgen.makeClue) and the text is pre-filled, so nothing is recomputed during play.
export const CLUE_EXIT = [
  "o caminho é a {dir}",
  "uma corrente de ar fresca vem da {dir}",
  "você sente: a saída está a {dir}",
];
export function fillClue(template, dir) {
  return template.replaceAll("{dir}", DIR_PT[dir]);
}

// Escalating dread shown alongside each safe clue. Index 0 is calm (no extra
// line); the last entry is the final warning before the rigged death. dreadFor
// maps how many clues you've taken onto this ramp, scaling if CLUE_BUDGET != 3.
export const CLUE_DREAD = [
  "",
  "o objeto formiga na sua mão, você quer mais",
  "a vibração é quase insuportável, você não consegue parar",
];
const DREAD_BANDS = ["far", "near", "close"];
export function dreadFor(cluesUsed, budget) {
  // frac: 0 at the first clue, 1 at the last safe clue (cluesUsed === budget).
  const frac = budget <= 1 ? 1 : Math.min(1, (cluesUsed - 1) / (budget - 1));
  const idx = Math.min(CLUE_DREAD.length - 1, Math.round(frac * (CLUE_DREAD.length - 1)));
  const band = DREAD_BANDS[Math.min(DREAD_BANDS.length - 1, Math.round(frac * (DREAD_BANDS.length - 1)))];
  return { text: CLUE_DREAD[idx], intensity: band };
}

export const INITIAL_DIALOG =
  "Nem todos os cantos da internet são seguros, você se aventurou demais e caiu nas backrooms da web. Será que vai encontrar a saída e conseguir se salvar? Ou vai se perder e ficar condenado a vagar pelos cantos mais obscuros da internet? Boa sorte";

export const CUES = {
  close:
    "Você escuta um barulho alto, com certeza não está sozinho aqui, tem algo logo a {dir}",
  near: "Passos ecoam a {dir}",
  far: "Um barulho a {dir}, ou será que foi coisa da sua cabeça?",
};
export function cueFor(intensity, dir) {
  return CUES[intensity].replaceAll("{dir}", DIR_PT[dir]);
}

export const TAUNTS = {
  hunter: "Ele te achou, deve ter sido o cheiro.", //TODO: elaborar sobre ele te guardar pra depois e tals
};
export function tauntFor(type) {
  return TAUNTS[type];
}

export const TRAP_DEATHS = [
  {
    text: "O chão treme e cede debaixo dos seus pés. Tudo acontece muito rápido, mas você sabe que está condenado a viver no limbo mais profundo da internet",
    image: null,
  },
  // TODO: This one bellow should not be a trap, but should be triggered after 5 minutes pass.
  {
    text: "Você jurava que já tinha passado aqui. É a sala, ela está na sua mente, você está aqui a tanto tempo, já se sente parte disso. O limbo mais profundo da internet agora é sua casa.",
    image: null,
  },
];
export const RIGGED_DEATH = {
  text: "Esse objeto tem algo estranho, uma certa vibração quando tocado. Fascinante. Quanto mais você olha e toca mais você quer experimentar essa sensação. Antes que possa perceber, é tarde demais, você é um com as paredes amarelas. Esse limbo agora é você e você agora é esse limbo.",
  image: null,
};

export const WIN_TEXT =
  "Ufa, uma saída, o mundo nunca foi tão belo. Aprecie, você pode não ter a mesma sorte da próxima vez";

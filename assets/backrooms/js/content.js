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
  "espelho",
  "mancha",
];
export const PROP_EMOJI = {
  quadro: "🖼️",
  lampada: "💡",
  cadeira: "🪑",
  caixa: "📦",
  espelho: "🪞",
  cano: "🚰",
  tomada: "🔌",
  mancha: "🩸",
};
// Each quadro_N prop kind shows a real painting hung on the wall (registered as
// a sprite at startup; see main.js + render.js resolveVisual).
export const QUADRO_SPRITES = {
  quadro_1: "/assets/backrooms/images/quadro-monociclo.jpg",
  quadro_2: "/assets/backrooms/images/quadro-creeper.jpg",
  quadro_3: "/assets/backrooms/images/quadro-caveira.jpg",
  quadro_4: "/assets/backrooms/images/quadro-karate.jpg",
};
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

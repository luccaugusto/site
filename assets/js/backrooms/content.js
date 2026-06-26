export const DIR_PT = { ahead: 'frente', back: 'tras', left: 'esquerda', right: 'direita' };

export const PROP_KINDS = ['quadro', 'lampada', 'cadeira', 'caixa', 'espelho', 'cano', 'tomada', 'mancha'];
export const PROP_EMOJI = {
  quadro: '🖼️', lampada: '💡', cadeira: '🪑', caixa: '📦',
  espelho: '🪞', cano: '🚰', tomada: '🔌', mancha: '🩸',
};
export const ENTITY_EMOJI = { hunter: '🫥', sprinter: '🏃', wanderer: '👁️', stalker: '🕴️' };

export const HINT_TRUTHFUL = [
  'a saida e pra {dir}.',
  'segue pra {dir}, eu vi a luz la.',
  'confia: {dir} te tira daqui.',
];
export const HINT_DECEPTIVE = [
  'a salvacao ta pra {dir}.',
  '{dir}... so {dir}. corre.',
  'eu sai por {dir}. juro.',
];
export function fillHint(template, dir) {
  return template.replaceAll('{dir}', DIR_PT[dir]);
}

export const CUES = {
  hunter:   { close: 'PASSOS pesados, do seu lado.', near: 'passos ecoando perto.', far: 'algo se arrasta longe.' },
  sprinter: { close: 'UM BAQUE correndo na sua direcao!', near: 'algo acelera no corredor.', far: 'um tropel distante.' },
  wanderer: { close: 'uma respiracao molhada por perto.', near: 'um murmurio vagando.', far: 'ecos sem rumo.' },
  stalker:  { close: 'voce sente que NAO esta sozinho.', near: 'cheiro de mofo se aproxima.', far: 'algo observa de longe.' },
};
export function cueFor(type, intensity) { return CUES[type][intensity]; }

export const TAUNTS = {
  hunter:   'ele te alcancou. as paredes amarelas sao a ultima coisa que voce ve.',
  sprinter: 'rapido demais. voce nem viu chegar.',
  wanderer: 'voce esbarrou nele no escuro. fim.',
  stalker:  'a dica era mentira. ele sorri.',
};
export function tauntFor(type) { return TAUNTS[type]; }

export const TRAP_DEATHS = [
  { text: 'o chao cede. voce cai pra dentro do nada amarelo.', image: null },
  { text: 'a sala se fecha. nao havia saida — so a sua pressa.', image: null },
];
export const RIGGED_DEATH = { text: 'voce nao devia ter tocado nisso.', image: null };

export const WIN_TEXT = 'voce achou a saida. as luzes fluorescentes apagam atras de voce.';

export const config = {
  ROOM_COUNT: 25,
  MAX_DEGREE: 4,
  SPAWN_MAX_DOORS: 3,
  EXIT_MAX_DOORS: 3,
  EXTRA_EDGE_RATIO: 0.15,        // extra edges ≈ ROOM_COUNT * ratio
  entities: [
    { type: 'hunter',   count: 1, speed: 1 },
    { type: 'sprinter', count: 1, speed: 2 },
    { type: 'wanderer', count: 1, speed: 1 },
    { type: 'stalker',  count: 1, speed: 1 },
  ],
  STALKER_AMBUSH_RANGE: 3,       // stalker closes in when player within this many rooms
  TRAP_ROOM_COUNT: 3,
  RIGGED_PROP_CHANCE: 0.15,
  DECEPTIVE_HINT_RATIO: 0.4,
  HINT_ROOM_CHANCE: 0.5,         // fraction of rooms that carry a hint
  PROPS_PER_ROOM: [0, 3],        // inclusive range
  CUE_THRESHOLDS: { close: 1, near: 2, far: 3 },
  INTRO_VIDEO: '/assets/backrooms/intro.mp4',
  INTRO_SKIPPABLE: true,
  INTRO_FALLBACK_MS: 4000,
  WIN_URL: '/',
  LOSE_URL: 'https://google.com',
  SEED: null,                    // null → seed from time / ?seed=
};

export default config;

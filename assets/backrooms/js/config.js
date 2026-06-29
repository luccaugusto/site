export const config = {
  DEBUG: true, // when true: show a "skip to exit" button in-game + reveal the WHOLE map on the win screen
  ROOM_COUNT: 25,
  MAX_DEGREE: 4,
  SPAWN_MAX_DOORS: 3,
  EXIT_MAX_DOORS: 3,
  EXTRA_EDGE_RATIO: 0.15, // extra edges ≈ ROOM_COUNT * ratio
  entities: [
    // { type: 'hunter',   count: 1, speed: 1 },
    // { type: 'sprinter', count: 1, speed: 2 },
    // { type: 'wanderer', count: 1, speed: 1 },
    // { type: 'stalker',  count: 1, speed: 1 },
  ],
  STALKER_AMBUSH_RANGE: 1, // stalker closes in when player within this many rooms
  TRAP_ROOM_COUNT: 1,
  CLUE_BUDGET: 3, // clue-props examinable before the next one is the rigged death
  CLUE_PROP_CHANCE: 0.3, // chance a non-lamp, non-exit prop carries an exit-pointing clue
  DECEPTIVE_HINT_RATIO: 0.1,
  HINT_ROOM_CHANCE: 0.2, // fraction of rooms that carry a hint
  PROPS_PER_ROOM: [0, 3], // inclusive range
  CUE_THRESHOLDS: { close: 1, near: 2, far: 3 },
  INTRO_GIF: "/assets/backrooms/nether-portal-animation.gif", // tiled background during the intro
  INTRO_SOUND: "/assets/backrooms/nether-portal-sound.m4a", // intro advances when this sound ends
  INTRO_SKIPPABLE: false,
  INTRO_FALLBACK_MS: 4000,
  WIN_URL: "/",
  LOSE_URL: "https://boards.4chan.org/mlp/",
  SEED: null, // null → seed from time / ?seed=
};

export default config;

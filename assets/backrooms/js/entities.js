import { neighborIds } from "./graph.js";
import { pick } from "./rng.js";

// The wanderer is the only entity: it strolls to a random adjacent room each
// step, oblivious to the player — you lose only by walking into it (or it into
// you). Any other type is inert (returns null → no move).
export function decide(state, entity, rng) {
  if (entity.type !== "wanderer") return null;
  const nbs = neighborIds(state.rooms[entity.roomId]);
  return nbs.length ? pick(rng, nbs) : null;
}

export function stepEntities(state, rng) {
  const entities = state.entities.map((e) => ({ ...e }));
  let caught = false,
    caughtBy = null;
  for (const e of entities) {
    for (let s = 0; s < e.speed; s++) {
      const target = decide({ ...state, entities }, e, rng);
      if (target === null) break;
      e.roomId = target;
      if (e.roomId === state.playerRoom) {
        caught = true;
        caughtBy = e;
        break;
      }
    }
    if (caught) break;
  }
  return { entities, caught, caughtBy };
}

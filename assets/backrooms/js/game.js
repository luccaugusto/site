import { generateMap, chooseEntitySpawns } from "./mapgen.js";
import { stepEntities } from "./entities.js";
import { bfsDistances, shortestStep, DIRECTIONS } from "./graph.js";
import * as C from "./content.js";

export function createGame(config, rng) {
  const map = generateMap(config, rng);
  return {
    config,
    rng,
    rooms: map.rooms,
    spawnId: map.spawnId,
    exitId: map.exitId,
    playerRoom: map.spawnId,
    visited: new Set([map.spawnId]),
    entities: chooseEntitySpawns(map, config, rng),
    status: "playing",
    loseReason: null,
    cluesUsed: 0,
  };
}

function cloneState(state) {
  return {
    ...state,
    visited: new Set(state.visited),
    entities: state.entities.map((e) => ({ ...e })),
  };
}

export function tick(state, action) {
  if (state.status !== "playing") return { state, events: [] };
  const events = [];
  const next = cloneState(state);

  // 1. Resolve the player's action.
  if (action.type === "move") {
    const dest = next.rooms[next.playerRoom].doors[action.dir];
    if (dest === undefined) return { state, events: [] }; // illegal → no-op
    next.playerRoom = dest;
    next.visited.add(dest);
    events.push({ type: "move", toRoom: dest });
    const room = next.rooms[dest];
    if (room.trap) {
      const death =
        C.TRAP_DEATHS[Math.floor(next.rng() * C.TRAP_DEATHS.length)];
      next.status = "lost";
      next.loseReason = "trap";
      events.push({
        type: "lose",
        reason: "trap",
        text: death.text,
        image: death.image,
      });
      return { state: next, events };
    }
  } else if (action.type === "interact") {
    const prop = next.rooms[next.playerRoom].props.find(
      (p) => p.id === action.propId,
    );
    if (!prop) return { state, events: [] }; // unknown prop → no-op
    const flipped = C.toggleLamp(prop.kind);
    if (flipped) {
      prop.kind = flipped; // silent on/off swap; still costs a turn
    } else if (prop.clue) {
      if (next.cluesUsed >= C.CLUE_DREAD.length) {
        // one clue too many → the one-with-the-backrooms death
        next.status = "lost";
        next.loseReason = "one_with_the_backrooms";
        events.push({
          type: "lose",
          reason: "one_with_the_backrooms",
          text: C.ONE_WITH_THE_BACKROOMS_DEATH.text,
          image: C.ONE_WITH_THE_BACKROOMS_DEATH.image,
        });
        return { state: next, events };
      }
      next.cluesUsed += 1;
      const dread = C.dreadFor(next.cluesUsed - 1);
      events.push({
        type: "clue",
        text: `Examinando ${C.propName(prop.kind)} você encontra um rabisco dizendo: ${prop.clue.text}. E tem algo estranho: ${dread.text}`,
        image: C.PROP_SPRITES[prop.kind],
      });
    } else {
      events.push({
        type: "flavor",
        text: `Você examina ${C.propName(prop.kind)}. Nada.`,
      });
    }
  } else if (action.type === "talk") {
    const person = next.rooms[next.playerRoom].person;
    if (!person) return { state, events }; // nobody here → no-op
    const def = C.personById(person.kind);
    events.push({
      type: "talk",
      text: def.text,
      image: def.image,
      name: def.name,
    });
  } else if (action.type === "exit") {
    if (next.playerRoom !== next.exitId) return { state, events: [] };
    next.status = "won";
    events.push({ type: "win", text: C.WIN_TEXT });
    return { state: next, events };
  } else {
    return { state, events: [] };
  }

  // 2. Did the player walk into an entity?
  for (const e of next.entities) {
    if (e.roomId === next.playerRoom) {
      next.status = "lost";
      next.loseReason = "caught";
      events.push({
        type: "lose",
        reason: "caught",
        text: C.tauntFor(e.type),
        image: null,
      });
      return { state: next, events };
    }
  }

  // 3. Advance entities by their speed.
  const res = stepEntities(next, next.rng);
  next.entities = res.entities;
  if (res.caught) {
    next.status = "lost";
    next.loseReason = "caught";
    events.push({
      type: "lose",
      reason: "caught",
      text: C.tauntFor(res.caughtBy.type),
      image: null,
    });
    return { state: next, events };
  }

  // 4. Sensory cue from the nearest entity.
  const cue = computeCue(next);
  if (cue) events.push(cue);

  return { state: next, events };
}

function computeCue(state) {
  let nearest = null,
    nearestDist = Infinity;
  for (const e of state.entities) {
    const d =
      bfsDistances(state.rooms, e.roomId).get(state.playerRoom) ?? Infinity;
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }
  if (nearest === null) return null;
  const t = state.config.CUE_THRESHOLDS;
  let intensity;
  if (nearestDist <= t.close) intensity = "close";
  else if (nearestDist <= t.near) intensity = "near";
  else if (nearestDist <= t.far) intensity = "far";
  else return null;
  // Direction toward the nearest entity: first step of the shortest path to it.
  // The cue templates fill {dir} from this (see content.cueFor / CUES).
  const step = shortestStep(state.rooms, state.playerRoom, nearest.roomId);
  const dir = DIRECTIONS.find(
    (d) => state.rooms[state.playerRoom].doors[d] === step,
  );
  return { type: "cue", text: C.cueFor(intensity, dir), intensity };
}

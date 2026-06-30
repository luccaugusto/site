export const DIRECTIONS = ["ahead", "back", "left", "right"];
export const RECIPROCAL = {
  ahead: "back",
  back: "ahead",
  left: "right",
  right: "left",
};
// Screen-ish deltas for the win-screen layout: ahead = up.
export const DELTA = {
  ahead: [0, -1],
  back: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export function neighborIds(room) {
  const out = [];
  for (const d of DIRECTIONS)
    if (room.doors[d] !== undefined) out.push(room.doors[d]);
  return out;
}

export function bfsDistances(rooms, fromId) {
  const dist = new Map([[fromId, 0]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of neighborIds(rooms[cur])) {
      if (!dist.has(nb)) {
        dist.set(nb, dist.get(cur) + 1);
        queue.push(nb);
      }
    }
  }
  return dist;
}

function bfsParents(rooms, fromId, toId) {
  const parent = new Map([[fromId, fromId]]);
  const queue = [fromId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toId) break;
    for (const nb of neighborIds(rooms[cur])) {
      if (!parent.has(nb)) {
        parent.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  return parent;
}

export function shortestStep(rooms, fromId, toId) {
  if (fromId === toId) return null;
  const parent = bfsParents(rooms, fromId, toId);
  if (!parent.has(toId)) return null;
  let node = toId;
  while (parent.get(node) !== fromId) node = parent.get(node);
  return node;
}

export function shortestPath(rooms, fromId, toId) {
  const parent = bfsParents(rooms, fromId, toId);
  if (!parent.has(toId)) return null;
  const path = [toId];
  while (path[0] !== fromId) path.unshift(parent.get(path[0]));
  return path;
}

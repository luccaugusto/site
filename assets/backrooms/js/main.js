import { config } from "./config.js";
import { makeRng } from "./rng.js";
import { createGame, tick } from "./game.js";
import { renderRoom, registerSprite } from "./render.js";
import { PROP_SPRITES, TIME_DEATH, INITIAL_DIALOG } from "./content.js";
import { showCue, showDialog } from "./messages.js";
import { playIntro } from "./intro.js";
import { showWinScreen } from "./winscreen.js";
import { buildMapEl } from "./mapview.js";
import { preloadImages } from "./preload.js";

function seedFromEnv() {
  const q = new URLSearchParams(location.search).get("seed");
  if (q !== null && q !== "") return Number(q) >>> 0;
  if (config.SEED !== null) return config.SEED >>> 0;
  return (Date.now() ^ (Math.random() * 1e9)) >>> 0;
}

// Register every prop kind's sprite so render draws it as an <img>.
for (const [kind, url] of Object.entries(PROP_SPRITES)) {
  registerSprite(`prop:${kind}`, url);
}

const root = document.getElementById("br-game");
let game = createGame(config, makeRng(seedFromEnv()));
let busy = false;
let timeLimitTimer = null;
let timeLimitStartedAt = null; // when the current countdown armed; escape time = now - this

// Time death: the backrooms claim you after config.TIME_LIMIT_MS of play. This is
// a real-time concern, so it lives here (the wiring layer) rather than in tick(),
// which is a pure, deterministic, turn-based state machine. Armed once gameplay
// starts (after the intro) and cleared the moment the run ends any other way.
function startTimeLimit() {
  timeLimitStartedAt = Date.now();
  if (!config.TIME_LIMIT_MS) return;
  timeLimitTimer = setTimeout(onTimeLimit, config.TIME_LIMIT_MS);
}

function clearTimeLimit() {
  if (timeLimitTimer !== null) {
    clearTimeout(timeLimitTimer);
    timeLimitTimer = null;
  }
}

function onTimeLimit() {
  timeLimitTimer = null;
  if (game.status !== "playing") return;
  game.status = "lost";
  game.loseReason = "time";
  busy = true; // run's over — lock input behind the death screen
  showDialog({
    text: TIME_DEATH.text,
    image: TIME_DEATH.image,
    button: "Sair",
    onClose: () => {
      location.href = config.LOSE_URL;
    },
  });
}

async function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === "cue") {
      showCue(ev.text, ev.intensity);
    } else if (ev.type === "flavor") {
      showCue(ev.text, "far");
    } else if (ev.type === "clue") {
      showDialog({ text: ev.text, image: ev.image });
    } else if (ev.type === "talk")
      showDialog({ text: ev.text, image: ev.image });
    else if (ev.type === "win") {
      onWin();
      return true;
    } else if (ev.type === "captured") {
      // Non-fatal capture: show the text, then wake up in a brand-new map far from
      // the wanderer. onAction disarms the time-limit timer (this is terminal for
      // the current map); relocateAfterCapture re-arms it fresh on the new map.
      showDialog({
        text: ev.text,
        image: ev.image,
        button: "Continuar",
        onClose: () => relocateAfterCapture(ev.captureCount),
      });
      return true;
    } else if (ev.type === "lose") {
      // Wait for the player to dismiss the death screen before redirecting.
      showDialog({
        text: ev.text,
        image: ev.image,
        button: "Sair",
        onClose: () => {
          location.href = config.LOSE_URL;
        },
      });
      return true;
    }
  }
  return false;
}

function onWin() {
  // Time the player took to escape = elapsed since the (current) countdown armed,
  // i.e. config.TIME_LIMIT_MS minus whatever was left on the clock.
  const escapeMs =
    timeLimitStartedAt !== null ? Date.now() - timeLimitStartedAt : null;
  showWinScreen(game, config, escapeMs);
}

// Stash the player in a fresh map after a (survivable) capture. captureCount rides
// along so the new map's tick knows whether the next capture is the fatal one.
function relocateAfterCapture(captureCount) {
  game = createGame(config, makeRng(seedFromEnv()), captureCount);
  render();
  startTimeLimit();
  busy = false; // capture locked input; the new map hands control back
}

async function onAction(action) {
  if (busy || game.status !== "playing") return;
  busy = true;
  const { state, events } = tick(game, action);
  game = state;
  if (game.status === "playing") render();
  const terminal = await handleEvents(events);
  if (terminal) clearTimeLimit(); // won/died another way — disarm the time death
  if (!terminal) busy = false; // stay locked once the game ends
}

// DEBUG: jump straight to a win (reveals the win screen, which shows the whole map in debug).
function debugSkipToExit() {
  if (game.status !== "playing") return;
  busy = true;
  clearTimeLimit();
  game.status = "won";
  onWin();
}

function mountDebugControls() {
  if (!config.DEBUG) return;
  const skip = document.createElement("button");
  skip.className = "br-debug-skip";
  skip.textContent = "> pular p/ saída";
  skip.title = "DEBUG: vencer imediatamente";
  skip.addEventListener("click", debugSkipToExit);
  document.body.append(skip);
}

// DEBUG: a live minimap of the WHOLE map with the player's current position, redrawn each move.
let minimapEl = null;
function renderMinimap() {
  if (!config.DEBUG) return;
  if (!minimapEl) {
    minimapEl = document.createElement("div");
    minimapEl.className = "br-minimap";
    document.body.append(minimapEl);
  }
  minimapEl.innerHTML = '<div class="br-minimap__cap">DEBUG · mapa</div>';
  const all = new Set(game.rooms.map((r) => r.id));
  minimapEl.append(
    buildMapEl(game, {
      reveal: all,
      width: 240,
      height: 180,
      pad: 12,
      here: game.playerRoom,
      entityRooms: new Set(game.entities.map((e) => e.roomId)),
      markEnds: false,
    }),
  );
}

// Draw the current room, plus (in debug) the live minimap.
function render() {
  renderRoom(root, game, onAction);
  renderMinimap();
}

(async () => {
  // Warm the cache for every game image while the intro plays. Fire-and-forget
  // (not awaited) so a slow asset can never stall the game — by the time the
  // intro ends, the backdrop, doors, props and portraits are already cached and
  // rooms render without the on-demand pop-in.
  preloadImages();
  await playIntro(config);
  render();
  mountDebugControls();
  // Framing text over the just-rendered first room. The escape clock only arms
  // once the player dismisses it, so reading the setup isn't a time penalty.
  await showDialog({ text: INITIAL_DIALOG });
  startTimeLimit();
})();

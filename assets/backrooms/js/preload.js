import { config } from "./config.js";
import { PROP_SPRITES, PEOPLE } from "./content.js";

// Images referenced ONLY from backrooms.css. The browser won't fetch these until
// the element that uses them first renders — background.jpg the moment the first
// room appears, each door variant the first time that door is shown — which is
// exactly the mid-game hitch this module exists to avoid. Keep in sync with the
// url("…") rules in backrooms.css (there is no JS source of truth for them).
const CSS_IMAGES = [
  "/assets/backrooms/images/background.jpg",
  "/assets/backrooms/images/door-ahead.png",
  "/assets/backrooms/images/door-left.png",
  "/assets/backrooms/images/door-right.png",
  "/assets/backrooms/images/door-back.png",
  "/assets/backrooms/images/door-ahead-trap.png",
  "/assets/backrooms/images/door-left-trap.png",
  "/assets/backrooms/images/door-right-trap.png",
  "/assets/backrooms/images/door-back-trap.png",
];

// Every image the game can show: the prop sprites and people portraits (from
// their JS sources of truth), the intro backdrop, and the CSS-only list above.
// Deduped so an asset referenced twice is only fetched once.
export function collectImageUrls() {
  const urls = [
    ...Object.values(PROP_SPRITES),
    ...PEOPLE.map((p) => p.image),
    config.INTRO_GIF,
    ...CSS_IMAGES,
  ];
  return [...new Set(urls.filter(Boolean))];
}

// Warm the browser cache for every game image. Fire-and-forget by design: kicked
// off while the intro plays, so assets are already cached by the time the first
// room renders and the CSS/`<img>` requests hit the disk cache instead of the
// network. Failures resolve rather than reject — a missing sprite shouldn't stall
// the preload. Returns a promise that settles once every fetch has, for any
// caller that wants to await the warm-up.
export function preloadImages(urls = collectImageUrls()) {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
}

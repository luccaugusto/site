---
---
// Splash text array is baked in from _data/splashes.yml at Jekyll build time.
const splashTexts = {{ site.data.splashes | jsonify }};

function setSplashText() {
  const splash = document.getElementById("splash-text");
  if (!splash) return;
  const target = splash.querySelector("span") || splash;
  // Birthday override: on May 28th (local date), always wish myself well.
  const now = new Date();
  if (now.getMonth() === 4 && now.getDate() === 28) {
    target.textContent = "Happy Birthday to Me!";
    return;
  }
  // Whole days since the Unix epoch (UTC) — same value for every visitor on a
  // given day, so everyone sees the same splash and it rolls over once daily.
  const day = Math.floor(Date.now() / 86400000);
  target.textContent = splashTexts[day % splashTexts.length];
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setSplashText);
} else {
  setSplashText();
}

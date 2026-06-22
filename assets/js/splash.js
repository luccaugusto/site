---
---
// Splash text array is baked in from _data/splashes.yml at Jekyll build time.
const splashTexts = {{ site.data.splashes | jsonify }};

function setSplashText() {
  const splash = document.getElementById("splash-text");
  if (!splash) return;
  const target = splash.querySelector("span") || splash;
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

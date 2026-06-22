/* billboard-screen.js
 *
 * Warps .billboard-screen onto the billboard's angled display hole and keeps it
 * pixel-exact at every screen size. A static CSS matrix3d can't do this: its
 * perspective/translation terms are baked in pixels at one size, so on smaller
 * screens the far edge over-foreshortens and drifts inward. Instead we re-solve
 * the homography on every size change from scale-independent corner FRACTIONS,
 * so the source rect and destination quad scale together and the warp stays put.
 *
 * FRAC = the four destination corners (TL, TR, BR, BL) as fractions of the
 * screen's own width/height, tuned with the corner-pin dev tool. To re-tune,
 * re-add that tool, drag, and replace these numbers.
 *
 * The static matrix3d in style.css is the no-JS fallback (correct at the tuning
 * size, approximate elsewhere). transform-origin must stay 0 0.
 */
(function () {
  "use strict";

  var FRAC = [
    [-0.00174, -0.00226], // TL
    [ 0.98644,  0.17346], // TR
    [ 1.00239,  1.00013], // BR
    [-0.00174,  0.91474]  // BL
  ];

  // Solve A x = b (Gauss-Jordan, n x n).
  function solve(A, b) {
    var n = b.length, i, r, c, col;
    var M = A.map(function (row, k) { return row.concat([b[k]]); });
    for (col = 0; col < n; col++) {
      var piv = col;
      for (r = col + 1; r < n; r++)
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      var t = M[col]; M[col] = M[piv]; M[piv] = t;
      var d = M[col][col];
      if (Math.abs(d) < 1e-12) continue;
      for (r = 0; r < n; r++) {
        if (r === col) continue;
        var f = M[r][col] / d;
        if (f === 0) continue;
        for (c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    var x = new Array(n);
    for (i = 0; i < n; i++) x[i] = M[i][n] / M[i][i];
    return x;
  }

  // Homography mapping the 4 src points to the 4 dst points -> [a,b,c,d,e,f,g,h].
  function homography(src, dst) {
    var A = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var sx = src[i][0], sy = src[i][1], dx = dst[i][0], dy = dst[i][1];
      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]); b.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]); b.push(dy);
    }
    return solve(A, b);
  }

  function fmt(n) { return Math.round(n * 1e6) / 1e6; }

  var screen;
  function apply() {
    if (!screen) return;
    var W = screen.offsetWidth, H = screen.offsetHeight;
    if (!W || !H) return;
    var src = [[0, 0], [W, 0], [W, H], [0, H]];
    var dst = FRAC.map(function (p) { return [p[0] * W, p[1] * H]; });
    var h = homography(src, dst); // rows [a b c; d e f; g hh 1]
    screen.style.transformOrigin = "0 0";
    screen.style.transform = "matrix3d(" +
      fmt(h[0]) + "," + fmt(h[3]) + ",0," + fmt(h[6]) + ", " +
      fmt(h[1]) + "," + fmt(h[4]) + ",0," + fmt(h[7]) + ", " +
      "0,0,1,0, " +
      fmt(h[2]) + "," + fmt(h[5]) + ",0,1)";
  }

  function init() {
    screen = document.querySelector(".billboard-screen");
    if (!screen) return;
    apply();
    if (window.ResizeObserver) new ResizeObserver(apply).observe(screen);
    else window.addEventListener("resize", apply);
    // Image load can change .billboard height (and thus the screen's size).
    var img = document.querySelector(".billboard-img");
    if (img && !img.complete) img.addEventListener("load", apply);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

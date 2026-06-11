/* billboard-corner-pin.js — TEMPORARY dev tool.
 *
 * Four draggable corner handles on .billboard-screen. Drag a corner and the
 * tool solves the 2D homography (square -> quad) and writes it as a CSS
 * matrix3d() live, so the other three corners stay locked. Copy the result
 * into style.css when done.
 *
 * Activate with `?pin` in the URL (sticks for the session; `?nopin` clears).
 * No-op otherwise. DELETE this file + its <script> tag once values are baked
 * into style.css.
 *
 * Math: with transform-origin at 0 0, the screen's untransformed border box
 * has local corners (0,0),(W,0),(W,H),(0,H). We map those to the dragged
 * destination points (in the element's local space) via an 8-DOF homography
 * H = [a b c; d e f; g h 1], then embed column-major:
 *   matrix3d(a,d,0,g,  b,e,0,h,  0,0,1,0,  c,f,0,1)
 */
(function () {
  "use strict";

  var search = location.search;
  if (/[?&]nopin\b/.test(search)) sessionStorage.removeItem("bbPin");
  else if (/[?&]pin\b/.test(search)) sessionStorage.setItem("bbPin", "1");
  if (sessionStorage.getItem("bbPin") !== "1") return;

  var STORE_KEY = "billboardCornerPin"; // saved as destination fractions of W,H
  var LABELS = ["TL", "TR", "BR", "BL"];
  var COLORS = ["#00f3ff", "#ffe600", "#ff2d95", "#7CFC00"];

  // ---- linear algebra ----
  function solve(A, b) {
    // Gauss-Jordan, n x n
    var n = b.length,
      i,
      r,
      c,
      col;
    var M = A.map(function (row, k) {
      return row.concat([b[k]]);
    });
    for (col = 0; col < n; col++) {
      var piv = col;
      for (r = col + 1; r < n; r++)
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      var tmp = M[col];
      M[col] = M[piv];
      M[piv] = tmp;
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

  function homography(src, dst) {
    // returns [a,b,c,d,e,f,g,h]
    var A = [],
      b = [],
      i;
    for (i = 0; i < 4; i++) {
      var sx = src[i][0],
        sy = src[i][1],
        dx = dst[i][0],
        dy = dst[i][1];
      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      b.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      b.push(dy);
    }
    return solve(A, b);
  }

  function parseMatrix(str) {
    // CSS transform -> 16-element column-major 4x4
    if (!str || str === "none")
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    var m = str.match(/matrix(3d)?\(([^)]+)\)/);
    if (!m) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    var v = m[2].split(",").map(parseFloat);
    if (m[1]) return v;
    return [v[0], v[1], 0, 0, v[2], v[3], 0, 0, 0, 0, 1, 0, v[4], v[5], 0, 1];
  }

  function project(m, x, y) {
    // apply 4x4 (col-major) to (x,y,0,1), perspective divide
    var X = m[0] * x + m[4] * y + m[12];
    var Y = m[1] * x + m[5] * y + m[13];
    var W = m[3] * x + m[7] * y + m[15];
    return [X / W, Y / W];
  }

  function fmt(n) {
    return (Math.round(n * 100000) / 100000).toString();
  }

  function init() {
    var board = document.querySelector(".billboard");
    var screen = document.querySelector(".billboard-screen");
    if (!board || !screen) return;

    screen.style.transformOrigin = "0 0";

    var W,
      H,
      baseFrac,
      frac,
      sel = 2; // default-select BR
    var dots = [];

    function dims() {
      W = screen.offsetWidth;
      H = screen.offsetHeight;
    }

    function srcCorners() {
      return [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ];
    }

    // initial destination = where the CURRENT css transform puts the corners
    function readBaseline() {
      dims();
      var m = parseMatrix(getComputedStyle(screen).transform);
      var src = srcCorners();
      baseFrac = src.map(function (p) {
        var d = project(m, p[0], p[1]);
        return [d[0] / W, d[1] / H];
      });
    }

    function load() {
      try {
        var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
        if (s && s.length === 4)
          return s.map(function (p) {
            return [p[0], p[1]];
          });
      } catch (e) {}
      return baseFrac.map(function (p) {
        return [p[0], p[1]];
      });
    }

    function destPx() {
      return frac.map(function (p) {
        return [p[0] * W, p[1] * H];
      });
    }

    function matrixCss() {
      var h = homography(srcCorners(), destPx());
      // h = [a,b,c,d,e,f,g,hh] for rows [a b c; d e f; g hh 1]
      return (
        "matrix3d(" +
        fmt(h[0]) +
        ", " +
        fmt(h[3]) +
        ", 0, " +
        fmt(h[6]) +
        ",  " +
        fmt(h[1]) +
        ", " +
        fmt(h[4]) +
        ", 0, " +
        fmt(h[7]) +
        ",  " +
        "0, 0, 1, 0,  " +
        fmt(h[2]) +
        ", " +
        fmt(h[5]) +
        ", 0, 1)"
      );
    }

    function apply() {
      var css = matrixCss();
      screen.style.transform = css;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(frac));
      } catch (e) {}
      placeDots();
      var pre = panel.querySelector("#bbp-css");
      if (pre)
        pre.textContent =
          ".billboard-screen {\n    transform-origin: 0 0;\n    transform: " +
          css.replace(/,  /g, ",\n        ") +
          ";\n}";
    }

    function placeDots() {
      var dp = destPx();
      for (var i = 0; i < 4; i++) {
        dots[i].style.left = screen.offsetLeft + dp[i][0] + "px";
        dots[i].style.top = screen.offsetTop + dp[i][1] + "px";
        dots[i].style.outline = i === sel ? "2px solid #fff" : "none";
      }
    }

    // ---- panel ----
    var panel = document.createElement("div");
    panel.id = "bbp-panel";
    panel.innerHTML =
      "<style>" +
      "#bbp-panel{position:fixed;top:8px;right:8px;z-index:2147483647;width:300px;" +
      "background:rgba(12,12,20,.94);color:#e6e6f0;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;" +
      "border:1px solid #ff2d95;border-radius:8px;padding:9px 11px;box-shadow:0 0 18px rgba(255,45,149,.4)}" +
      "#bbp-panel h3{margin:0 0 6px;font-size:12px;color:#00f3ff;letter-spacing:.5px}" +
      "#bbp-panel p{margin:4px 0;color:#9fb}" +
      "#bbp-panel .btns{display:flex;gap:6px;margin:8px 0 4px}" +
      "#bbp-panel button{flex:1;background:#00f3ff;color:#000;border:0;border-radius:4px;" +
      "font:bold 11px ui-monospace,monospace;padding:6px;cursor:pointer;text-transform:uppercase}" +
      "#bbp-panel button.alt{background:#ff2d95;color:#fff}" +
      "#bbp-panel pre{white-space:pre-wrap;background:#000;border:1px solid #345;border-radius:4px;" +
      "padding:6px;margin:6px 0 0;font-size:10.5px;color:#9fe;max-height:40vh;overflow:auto}" +
      ".bbp-dot{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;" +
      "border:2px solid #000;cursor:grab;z-index:2147483646;box-shadow:0 0 6px rgba(0,0,0,.8);touch-action:none}" +
      ".bbp-dot span{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font:bold 10px ui-monospace,monospace;" +
      "color:#fff;text-shadow:0 0 3px #000;pointer-events:none}" +
      "</style>" +
      "<h3>corner pin</h3>" +
      "<p>Drag a dot, or click it + arrow keys (shift = 10px). Selected: " +
      '<b id="bbp-sel">BR</b></p>' +
      '<div class="btns"><button id="bbp-copy">Copy CSS</button>' +
      '<button id="bbp-reset" class="alt">Reset</button></div>' +
      '<pre id="bbp-css"></pre>';
    document.body.appendChild(panel);

    // ---- dots ----
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        var dot = document.createElement("div");
        dot.className = "bbp-dot";
        dot.style.background = COLORS[idx];
        dot.tabIndex = 0;
        dot.innerHTML = "<span>" + LABELS[idx] + "</span>";
        board.appendChild(dot);
        dots[idx] = dot;

        function select() {
          sel = idx;
          panel.querySelector("#bbp-sel").textContent = LABELS[idx];
          placeDots();
        }

        dot.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          select();
          dot.setPointerCapture(e.pointerId);
          dot.style.cursor = "grabbing";
          var move = function (ev) {
            var r = board.getBoundingClientRect();
            var x = ev.clientX - r.left - screen.offsetLeft;
            var y = ev.clientY - r.top - screen.offsetTop;
            frac[idx] = [x / W, y / H];
            apply();
          };
          var up = function () {
            dot.releasePointerCapture(e.pointerId);
            dot.style.cursor = "grab";
            dot.removeEventListener("pointermove", move);
            dot.removeEventListener("pointerup", up);
          };
          dot.addEventListener("pointermove", move);
          dot.addEventListener("pointerup", up);
        });

        dot.addEventListener("focus", select);
        dot.addEventListener("keydown", function (e) {
          var step = e.shiftKey ? 10 : 1,
            dx = 0,
            dy = 0;
          if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;
          else if (e.key === "ArrowUp") dy = -step;
          else if (e.key === "ArrowDown") dy = step;
          else return;
          e.preventDefault();
          frac[idx] = [frac[idx][0] + dx / W, frac[idx][1] + dy / H];
          apply();
        });
      })(i);
    }

    panel.querySelector("#bbp-copy").addEventListener("click", function () {
      var pre = panel.querySelector("#bbp-css");
      if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent);
      var b = panel.querySelector("#bbp-copy"),
        o = b.textContent;
      b.textContent = "Copied!";
      setTimeout(function () {
        b.textContent = o;
      }, 900);
    });
    panel.querySelector("#bbp-reset").addEventListener("click", function () {
      frac = baseFrac.map(function (p) {
        return [p[0], p[1]];
      });
      apply();
    });

    window.addEventListener("resize", function () {
      dims();
      apply();
    });

    readBaseline();
    frac = load();
    apply();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

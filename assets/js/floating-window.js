/*
 * Floating window
 *
 * Draggable window chrome for the site. Rewritten from the 2006
 * dhtmlgoodies library (Alf Magne Kalleland) into dependency-free modern JS:
 * pointer-events dragging, minimize/maximize toggle, close, and
 * click-to-front z-index stacking.
 *
 * Preserves the existing markup contract so layouts/includes don't change:
 *   .window
 *     .window_top           (drag handle / title bar)
 *       .top_buttons
 *         img.minimizeButton
 *         img.closeButton
 *     .windowMiddle > .windowContent
 *     .window_bottom
 */
(function () {
	"use strict";

	// Absolutely-positioned windows don't grow the page, so on tall content
	// the body can be too short to scroll to the bottom of a window. Track the
	// lowest window edge and give the body enough min-height to reach it.
	function updateBodyHeight() {
		var maxBottom = 0;
		document.querySelectorAll(".window").forEach(function (win) {
			if (win.style.display === "none") return;
			maxBottom = Math.max(maxBottom, win.offsetTop + win.offsetHeight);
		});
		if (maxBottom > 0) document.body.style.minHeight = maxBottom + 40 + "px";
	}

	var topZIndex = 1000;
	function bringToFront(win) {
		win.style.zIndex = ++topZIndex;
	}

	function makeDraggable(win, handle) {
		var startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

		handle.addEventListener("pointerdown", function (e) {
			// Let clicks on the title-bar buttons through to their handlers.
			if (e.target.closest(".top_buttons")) return;
			dragging = true;
			startX = e.clientX;
			startY = e.clientY;
			startLeft = win.offsetLeft;
			startTop = win.offsetTop;
			handle.setPointerCapture(e.pointerId);
			e.preventDefault();
		});

		handle.addEventListener("pointermove", function (e) {
			if (!dragging) return;
			win.style.left = startLeft + (e.clientX - startX) + "px";
			win.style.top = startTop + (e.clientY - startY) + "px";
		});

		function endDrag(e) {
			if (!dragging) return;
			dragging = false;
			if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
			updateBodyHeight();
		}
		handle.addEventListener("pointerup", endDrag);
		handle.addEventListener("pointercancel", endDrag);
	}

	function wireMinimize(win, button) {
		var content = win.querySelector(".windowContent");
		if (!content) return;
		button.addEventListener("click", function () {
			if (content.style.display === "none") {
				content.style.display = "";
				button.src = button.src.replace("maximize", "minimize");
			} else {
				content.style.display = "none";
				button.src = button.src.replace("minimize", "maximize");
			}
			updateBodyHeight();
		});
	}

	function wireClose(win, button) {
		button.addEventListener("click", function () {
			win.style.display = "none";
			updateBodyHeight();
		});
	}

	function initWindow(win) {
		var topBar = win.querySelector(".window_top");
		if (topBar) makeDraggable(win, topBar);

		var minimizeBtn = win.querySelector(".minimizeButton");
		if (minimizeBtn) wireMinimize(win, minimizeBtn);

		var closeBtn = win.querySelector(".closeButton");
		if (closeBtn) wireClose(win, closeBtn);

		win.addEventListener("pointerdown", function () { bringToFront(win); });
	}

	function init() {
		document.querySelectorAll(".window").forEach(initWindow);
		updateBodyHeight();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
	// Images/iframes finish loading after DOMContentLoaded and change heights.
	window.addEventListener("load", updateBodyHeight);
})();

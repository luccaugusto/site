# Synthwave Canvas Redesign — Design Spec

**Date:** 2026-06-04
**Status:** Draft — visual direction only, no code yet
**Reference image:** `assets/synthwave-canvas-reference.png` (generated mockup)

---

## 1. Overview

Redesign the personal site as a full-screen **desktop-canvas/poster** layout. Each major section becomes a floating black panel placed deliberately across the viewport — not snapped to a grid. The background is a clean synthwave scene drawn by hand. The overall feel should be warm, intentional, and personal — like a carefully composed poster rather than a traditional website.

---

## 2. Visual Direction (Pass 1: Clean Synthwave)

| Element | Description |
|---------|-------------|
| Background base | Warm beige / dusk sand tone |
| Background art | Sparse synthwave horizon: thin magenta-to-orange gradient line, faint retro grid, partial sun |
| Content panels | Matte black or very dark purple-black, large rounded corners |
| Panel headers | Crooked orange/yellow slanted strips overlapping the panel top edge |
| Accent colors | Cyan, magenta, orange — used sparingly as small dots, lines, or faint glows |
| Typography | Simple sans-serif for body; bold/italic black text on headers |

### Color Palette (approximate)

- Background: `#e8d5b7` (warm beige)
- Panels: `#0d0d0d` (matte black)
- Header strips: `#f0a830` (warm orange-yellow)
- Accent cyan: `#00f3ff`
- Accent magenta: `#ff2d95`
- Accent orange: `#ff8100`
- Content text: `#e0e0e0` (light gray on black panels)

---

## 3. Layout Composition

The page is one large full-viewport canvas. Panels are placed at specific coordinates to create an asymmetric, poster-like composition.

### Panel Placement (desktop, ~1440px viewport)

| Panel | Position | Size | Content |
|-------|----------|------|---------|
| **Sobre** (intro/profile) | Top-right | Large | Name, avatar, short bio, social links |
| **Projetos** (featured work) | Left-middle | Medium-large | Papo de Sauna highlight, portfolio link, other projects |
| **Blog** (recent posts) | Lower-left | Medium | Last 3-4 blog post titles with dates |
| **Contato** (links/contact) | Lower-right | Small-medium | Email, GitHub, other quick links |

### Placement Rules

- Panels should **not** align to each other on any axis.
- Leave generous beige space between panels so the background art breathes.
- Panels can overlap slightly at edges for depth.
- On mobile, panels stack vertically in reading order (Sobre, Projetos, Blog, Contato) with full width.

### Optional Floating Accents

- A small "piada do dia" joke card floating near a panel corner.
- Tiny decorative icons or labels (like the current site's personality touches).
- These are optional and should not clutter the composition.

---

## 4. Panel Style

### Black Content Panels

- Background: matte black (`#0d0d0d`).
- Border-radius: large (~20px).
- Border: none by default. One or two important panels can have a faint warm or cyan glow (`box-shadow`).
- Interior: simple, readable content with generous padding.
- No heavy internal structure — content sits cleanly inside.

### Crooked Header Strips

- Shape: rectangular strip, slightly wider than its text.
- Color: solid orange-yellow (`#f0a830`).
- Rotation: 1–3 degrees (slight clockwise or counter-clockwise skew via `transform: rotate()`).
- Position: overlapping the top edge of the panel — the strip sits partly above and partly over the panel.
- Text: bold or bold-italic, black, relatively large.
- Decorative: small marks or symbols beside the title text (like the "Episódios" header in PDS which has a sort icon).
- Each panel gets one header strip.

---

## 5. Background Art Brief

The background is a hand-drawn (or digitally illustrated) synthwave scene. It should be created as a separate image asset.

### Requirements

- **Base tone:** beige/dusk sky matching the screenshot warmth.
- **Horizon:** a thin gradient line (magenta to orange) sitting in the lower third of the viewport.
- **Grid:** faint retro perspective grid lines below the horizon, receding to a vanishing point.
- **Sun:** a partial circle (half or third visible) peeking above the horizon in soft orange/pink tones.
- **Accents:** very sparse — a few small dots or thin lines in cyan/magenta floating in the upper area.
- **Noise:** low. The background should be calmer and emptier than the current site's background images. Panels are the foreground; the background supports them, not competes.

### What To Avoid

- Busy palm tree silhouettes or heavy photo textures (the current site's approach).
- Strong color gradients that fight with panel readability.
- Too many grid lines or too-bright neon.

---

## 6. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Full canvas layout — panels float at designed positions |
| Tablet (768–1024px) | Panels shrink and reposition slightly, still floating but tighter |
| Mobile (<768px) | Panels stack vertically, full-width with small margin, headers stay crooked |

On mobile, the background art should still be visible between stacked panels (preserve some vertical spacing).

---

## 7. Sections Content Mapping

What goes inside each panel (content inventory from current site):

### Sobre

- Name/logo image (currently `lucca-full-synth.jpg`)
- Short bio/tagline
- Social links: GitHub, Spotify, MyAnimeList, Letterboxd, Orkut

### Projetos

- Papo de Sauna feature (image + short description + link)
- Portfolio link
- Skate gallery link
- Wallpapers link
- D&D page link

### Blog

- Last 3-4 post titles with dates
- Link to full blog page

### Contato

- Website URL
- Email or contact method
- Amazon wishlist link
- Any other quick links

---

## 8. Future Variant: Synthwave Zine Poster

After the clean version is built and feels solid, explore a second variant with:

- Rougher, more chaotic panel placement.
- Stickers, photos, and cutout-style elements floating around.
- Stronger diagonal movement and intentional visual noise.
- More personality and collage energy.
- Keep the same underlying structure (black panels, orange headers) but let it get messier.

This is noted for a future pass. Do not mix it into pass 1.

---

## 9. Implementation Notes (for when coding starts)

- The layout will likely use CSS `position: absolute` or CSS Grid with explicit placement.
- Headers use `transform: rotate()` for the crooked effect.
- Background is a single large image asset set via `background-image` on the body.
- Mobile layout switches to a simple flexbox column.
- Jekyll structure stays the same — only the HTML/CSS changes.

---

## 10. Reference

- **Generated mockup:** `assets/synthwave-canvas-reference.png` (copied to project root-relative path)
- **Original screenshot (PDS style reference):** attached in conversation
- **Current site CSS:** `assets/css/style.css`
- **Current homepage:** `index.html`

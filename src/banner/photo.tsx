// ═══════════════════════════════════════════════════════════════════════════
//  PHOTO LAYERS — the carved side panel + the full-bleed background
// ═══════════════════════════════════════════════════════════════════════════
//
//  The old Icon Kit build carved the photo on a <canvas> (paintPhotoPanel). This
//  rebuild is DOM/CSS like everything else here, so a photo is just a clipped div
//  with a background-image positioned by a focal point + zoom. Same visual result
//  (straight / diagonal / curve seam, drag-to-frame crop), far less code, and it
//  composites with the finish stack for free.
//
//  Two consumers, one PhotoSpec:
//    • PhotoPanel   — carves ONE side behind a shaped seam, returns the clear
//                     text zone so a template reflows its copy off the photo.
//    • FullBleedPhoto — fills the whole node behind the content (mood / quote).
//
//  No Math.random anywhere (deterministic export, house rule).

import type { CSSProperties } from "react";
import type { PhotoSpec } from "./model";

// ── High-quality downscale at upload ─────────────────────────────────────────
// A detailed portrait at 2000px+ downscaled straight to a ~700px panel by the
// browser's cheap inline path aliases into mottled/grainy skin. We pre-resize
// the upload ONCE through a canvas with imageSmoothingQuality:"high" so every
// later CSS scale is a gentle step — the photo stays smooth like the source.
// Also shrinks the stored data URL (kinder to the persisted blob).
const MAX_EDGE = 1600; // long-edge cap — plenty for a 1584px-wide banner

/** Downscale a data URL to MAX_EDGE (high quality). Returns the same string
 *  unchanged if it's already small enough or can't be decoded. This is the core
 *  used by BOTH the upload path AND the on-load migration (so a photo stored
 *  before the resize existed gets smoothed too — no re-upload needed). */
export function resizePhotoDataUrl(raw: string): Promise<string> {
  return new Promise((resolve) => {
    if (!raw || !raw.startsWith("data:image")) return resolve(raw);
    const img = new Image();
    img.onload = () => {
      try {
        const { width: w, height: h } = img;
        const long = Math.max(w, h);
        if (long <= MAX_EDGE) return resolve(raw); // already small enough
        const scale = MAX_EDGE / long;
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(raw);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, cw, ch);
        // JPEG at high quality keeps skin smooth and the blob small; keep PNG for
        // sources with transparency so it isn't flattened onto black.
        const isPng = raw.startsWith("data:image/png");
        resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92));
      } catch {
        resolve(raw);
      }
    };
    img.onerror = () => resolve(raw); // can't decode to resize — use as-is
    img.src = raw;
  });
}

/** Is this data URL a photo larger than the cap (i.e. worth migrating)? Resolves
 *  false for anything already small, non-decodable, or absent. */
export function photoNeedsResize(raw: string | null): Promise<boolean> {
  return new Promise((resolve) => {
    if (!raw || !raw.startsWith("data:image")) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(Math.max(img.width, img.height) > MAX_EDGE);
    img.onerror = () => resolve(false);
    img.src = raw;
  });
}

/** Read a File, downscale it to MAX_EDGE (high quality), return a data URL.
 *  Falls back to the raw data URL if anything about the canvas path fails. */
export function loadPhotoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.onload = async () => {
      const raw = String(reader.result || "");
      if (!raw) return reject(new Error("Empty image"));
      resolve(await resizePhotoDataUrl(raw));
    };
    reader.readAsDataURL(file);
  });
}

// The panel occupies this fraction of the width. Tuned to leave a comfortable
// text column on the clear side at every platform ratio.
const PANEL_FRACTION = 0.44;
// How far the seam leans across on a diagonal (as a fraction of width).
const DIAGONAL_LEAN = 0.1;

/** The object-position that keeps the focal point in view as the photo is
 *  cropped by object-fit: cover. focusX/Y are 0..1. */
function focalPosition(spec: PhotoSpec): string {
  const x = Math.round((spec.focusX ?? 0.5) * 100);
  const y = Math.round((spec.focusY ?? 0.35) * 100);
  return `${x}% ${y}%`;
}

/** Shared photo-fill style: cover the container, framed to the focal point,
 *  punched in by the zoom multiplier.
 *
 *  We use a background-image (not an <img> + object-fit + transform:scale). Why:
 *  a CSS transform:scale on top of object-fit:cover crops the photo TWICE and
 *  makes the browser resample an already-cropped raster — which reads as heavy
 *  pixelation on a real photo the moment zoom rises above 100%. background-size
 *  resamples straight from the SOURCE bitmap at the requested scale (what the old
 *  canvas build effectively did), so it stays crisp at any zoom. html-to-image
 *  bakes background-image data URLs cleanly, so export matches the preview. */
function photoFillStyle(spec: PhotoSpec): CSSProperties {
  const zoom = Math.max(1, spec.zoom ?? 1);
  // `cover` fills the box; the zoom multiplier scales that cover size up so the
  // resample comes from the source, not a pre-cropped layer.
  const size = zoom > 1 ? `${Math.round(zoom * 100)}%` : "cover";
  return {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("${spec.dataUrl}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: focalPosition(spec),
    backgroundSize: size,
    pointerEvents: "none",
    userSelect: "none",
  };
}

// ── The clip-path seam for the carved panel ──────────────────────────────────
// The panel BOX is (PANEL_FRACTION + leanFrac) of the node wide, hugging `side`.
// clip-path percentages are relative to the BOX, so we express the seam lean as
// a fraction of the BOX width, not the node width. That keeps the diagonal angle
// consistent regardless of PANEL_FRACTION.
//
// The seam is on the INNER edge of the box (toward the text): the right edge for
// a left panel, the left edge for a right panel. On a straight divider the box
// has no lean and the clip is a plain rectangle.
const BOX_FRACTION = PANEL_FRACTION + DIAGONAL_LEAN; // box width as a fraction of the node
const LEAN_IN_BOX = (DIAGONAL_LEAN / BOX_FRACTION) * 100; // the lean, in % of the box width
// The inner edge sits here (in % of the box) when there's no lean applied.
const INNER_EDGE = (PANEL_FRACTION / BOX_FRACTION) * 100;

function panelClip(side: "left" | "right", divider: PhotoSpec["divider"]): string {
  if (divider === "straight") {
    // A plain rectangle covering the panel portion of the (lean-free) box.
    return side === "left"
      ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
      : "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  }
  if (divider === "diagonal") {
    // Slope the inner edge across the lean. Left panel: inner edge runs from
    // (INNER_EDGE + lean) at top to INNER_EDGE at bottom. Right panel: mirror.
    return side === "left"
      ? `polygon(0 0, ${INNER_EDGE + LEAN_IN_BOX}% 0, ${INNER_EDGE}% 100%, 0 100%)`
      : `polygon(${100 - INNER_EDGE - LEAN_IN_BOX}% 0, 100% 0, 100% 100%, ${100 - INNER_EDGE}% 100%)`;
  }
  // curve — a gentle cosine bulge along the inner edge, in box-relative %.
  const pts: string[] = [];
  const steps = 16;
  const mid = INNER_EDGE + LEAN_IN_BOX / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = (Math.cos(t * Math.PI) * LEAN_IN_BOX) / 2;
    const edge = side === "left" ? mid + bulge : 100 - mid - bulge;
    pts.push(`${edge}% ${t * 100}%`);
  }
  if (side === "left") {
    return `polygon(0 0, ${pts.join(", ")}, 0 100%)`;
  }
  return `polygon(${pts.join(", ")}, 100% 100%, 100% 0)`;
}

/** The clear text zone {x0,x1} as % of the node, given a panel on `side`.
 *  Templates read this to keep copy off the photo. Accounts for the diagonal
 *  lean so text clears the widest point of the seam. */
export function photoTextZone(spec: PhotoSpec): { x0: number; x1: number } {
  const panel = PANEL_FRACTION * 100;
  const lean = spec.divider === "straight" ? 0 : DIAGONAL_LEAN * 100;
  if (spec.side === "left") {
    return { x0: panel + lean + 3, x1: 100 };
  }
  return { x0: 0, x1: 100 - panel - lean - 3 };
}

/** The carved side panel. Absolutely positioned to cover its side of the node. */
export function PhotoPanel({ spec }: { spec: PhotoSpec }) {
  if (!spec.dataUrl) return null;
  const panelPct = PANEL_FRACTION * 100;
  const clip = panelClip(spec.side, spec.divider);
  const boxStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: `${panelPct + (spec.divider === "straight" ? 0 : DIAGONAL_LEAN * 100)}%`,
    ...(spec.side === "left" ? { left: 0 } : { right: 0 }),
    clipPath: clip,
    overflow: "hidden",
  };
  return (
    <div aria-hidden style={boxStyle}>
      <div style={photoFillStyle(spec)} />
    </div>
  );
}

/** The full-bleed background photo. Sits at the very back (under finishes). */
export function FullBleedPhoto({ spec }: { spec: PhotoSpec }) {
  if (!spec.dataUrl) return null;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={photoFillStyle(spec)} />
    </div>
  );
}

// ── Placeholder for the gallery thumbnails ───────────────────────────────────
// When the user hasn't uploaded a photo yet, photo templates would look empty in
// the gallery. This soft portrait-toned gradient + figure silhouette signals
// "this template holds a photo" so the card reads correctly before upload. It is
// NEVER used in the real preview/export — only passed to thumbs.

/** A data-URI placeholder "photo" (a soft portrait gradient with a figure). */
export function placeholderPhoto(accent: string, ink: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${ink}'/><stop offset='1' stop-color='${accent}'/>` +
    `</linearGradient></defs>` +
    `<rect width='600' height='600' fill='url(#g)'/>` +
    // a simple centered figure silhouette so it reads as "person photo"
    `<g fill='rgba(255,255,255,0.16)'>` +
    `<circle cx='300' cy='235' r='95'/>` +
    `<path d='M120 600 q0-180 180-180 t180 180 z'/>` +
    `</g></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

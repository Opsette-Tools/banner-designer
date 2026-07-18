# Photo Panel — recipe for re-adding the "person/product photo on one side" layout

Written 2026-07-18, during the Icon Kit downgrade. This preserves the exact
contract of the old Social & Banners "photo panel" so a future session can add it
back to Banner Designer (with new templates that use it) **without guessing**.

## What this was

The old Icon Kit social tab had a layout where a **person or product photo is
carved into one side of the banner** behind a shaped divider — a "meet the team",
"about us", or product-hero look. It is SEPARATE from:
- the **logo** (`logoDataUrl`, drawn as a corner watermark), and
- the **OG-card background photo** (`bgImage`, a full-bleed photo behind text).

The photo panel is its own thing: the photo occupies ~42% of the width on the
chosen side, with a straight / diagonal / curve seam, a zoom, and a drag-to-set
focal point so a face stays framed.

## THE GOOD NEWS: the renderer already exists and was NOT deleted

The pixel-carving engine survived the Icon Kit downgrade — it lives in
`icon-kit/src/lib/icon-kit/canvas.ts` (a KEPT file). When porting to Banner
Designer, copy these from that file (Banner Designer forked canvas.ts already, so
they may already be present — verify):

- `paintPhotoPanel(ctx, spec, W, H)` — clips a shaped region on the chosen side,
  covers it with the photo at the right scale/focal crop, draws the divider.
  Returns the text zone `{ textX0, textX1 }` so the banner text reflows to the
  clear side.
- `interface PhotoPanelSpec` — the contract the renderer expects (below).
- `renderBanner(opts: BannerOpts)` — reads `opts.photo` (a `PhotoPanelSpec`) and
  composites it when the layout is the photo layout.

**So this is a UI + wiring job, not a rendering job.** Do not rewrite the carve
math — drive the existing engine.

## The exact contract (what the renderer expects)

```ts
/** A photo carved into one side of the banner behind a shaped divider. */
export interface PhotoPanelSpec {
  dataUrl: string;
  side: "left" | "right";
  divider: "straight" | "diagonal" | "curve";
  /** Zoom multiplier on the cover scale (1 = fill, >1 = punch in). Default 1. */
  zoom?: number;
  /** Focal point 0..1 — which part of the photo stays visible when cropped. */
  focusX?: number; // 0 = left edge, 1 = right edge
  focusY?: number; // 0 = top edge, 1 = bottom edge
}
```

State fields the old panel persisted (defaults matter — the 0.35 focusY frames
faces, which sit slightly above center):

```ts
panelPhoto: string | null   // = null
photoSide: "left" | "right" // = "left"
photoDivider: "straight" | "diagonal" | "curve" // = "diagonal"
photoZoom: number           // = 1     (UI slider 100–250%, stored as 1.0–2.5)
photoFocusX: number         // = 0.5
photoFocusY: number         // = 0.35
```

Wiring `renderBanner` (only pass `photo` when the photo layout is active):

```ts
photo:
  layout === "photo-panel" && s.panelPhoto
    ? {
        dataUrl: s.panelPhoto,
        side: s.photoSide,
        divider: s.photoDivider,
        zoom: s.photoZoom,
        focusX: s.photoFocusX,
        focusY: s.photoFocusY,
      }
    : undefined,
```

## The two UI pieces to rebuild (these WERE deleted from Icon Kit)

Both lived in the deleted `icon-kit/src/components/icon-kit/social-controls.tsx`.
Recover the originals with:
`git -C "c:/Opsette Tools/icon-kit" show HEAD:src/components/icon-kit/social-controls.tsx`
(they are in the commit BEFORE the downgrade — search that repo's log for the
Icon Kit downgrade commit and use its parent).

### 1. `PhotoPanelControls`
Upload/replace/remove the photo, plus:
- **Photo side** — Segmented Left / Right
- **Divider shape** — Segmented Straight / Diagonal / Curve
- **Zoom** — Slider `min={100} max={250}`, value `Math.round(zoom*100)`, onChange
  divides by 100 back to the 1.0–2.5 stored value.
- **Position** — the `PhotoFocusPad` widget below.

### 2. `PhotoFocusPad` (the special interaction — the "drag the dot" widget)
A 132px square showing the photo as a `background-image`, with a draggable dot.
Dragging sets `focusX/focusY` in 0..1 (clamped, rounded to 3 decimals) via
pointer events on `window` (so the drag continues outside the pad). The dot is a
22px white-ringed circle at `left: focusX*100%`, `top: focusY*100%`. Copy the
original verbatim — it's self-contained (only `useRef`/`useEffect` + inline
styles) and the numbers are tuned.

Helper text that shipped with it (keep the intent): *"Drag the dot onto what you
want kept in frame — put it on your face and it stays centered as you zoom. Then
set zoom to taste."*

## New templates that use the photo panel

Any new template that wants the photo simply sets its layout to the photo layout
and the renderer does the rest. The template just needs to:
1. declare it uses the photo layout (so the panel photo becomes visible), and
2. let its text zone come from `paintPhotoPanel`'s returned `{textX0, textX1}`
   rather than the full width, so copy never overlaps the photo.

Because the carve/zoom/focal engine is shared, every photo template renders
identically to the old social banners — same seams, same crop behavior — as long
as it feeds the `PhotoPanelSpec` above.

## Gotcha
The `photoZoom` UI/stored mismatch bites: **UI is a percent (100–250), state is a
multiplier (1.0–2.5).** Convert at the slider boundary, store the multiplier, and
pass the multiplier to `PhotoPanelSpec.zoom`.

// ═══════════════════════════════════════════════════════════════════════════
//  BannerCanvas — the ONE render node (preview === export)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Renders a template at the target platform's TRUE pixel size (e.g. 1584×396),
//  stacking three bands:
//    1. base background   (per-template solid / gradient / radial)
//    2. finish stack      (the composable layers, drawn back-to-front)
//    3. template content  (the slot-mapped composition, on top)
//
//  Preview scales this node down with a CSS transform (crisp — it's DOM, not a
//  raster). Export (html-to-image) captures the SAME node at scale 1, so what
//  you see is exactly what exports (house rule).

import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getPlatform, activeTemplateId, activeFinishes, type BannerState } from "./model";
import { useBannerBitmap } from "./use-banner-bitmap";
import { FinishStack } from "./finishes";
import { PhotoPanel, FullBleedPhoto } from "./photo";
import {
  getTemplate,
  buildContext,
  backgroundFor,
  finishPaletteFor,
  finishConfigsFor,
} from "./templates";

/**
 * The style for ANY wrapper that CSS-`transform: scale()`s a BannerNode down to a
 * preview/thumbnail size. `willChange`/`translateZ(0)` promotes the scaled subtree
 * to its own compositor layer so Chrome rasterizes it ONCE at display resolution
 * with high-quality resampling — otherwise a detailed photo mottles/graininess,
 * and the smaller the thumbnail, the worse the cheap inline downscale looks. Every
 * scaled-node call site (large preview, filmstrip, gallery) must spread this so the
 * fix is uniform. `scale` is the transform factor (container width / node width).
 */
export function scaledLayerStyle(scale: number): CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `scale(${scale}) translateZ(0)`,
    transformOrigin: "top left",
    willChange: "transform",
    backfaceVisibility: "hidden",
  };
}

/** The banner at true resolution. Ref points at the exportable node. */
export const BannerNode = forwardRef<HTMLDivElement, { state: BannerState }>(
  function BannerNode({ state }, ref) {
    const platform = getPlatform(state.platform);
    const tpl = getTemplate(activeTemplateId(state));
    const photoMode = tpl.photoMode ?? "none";
    const ctx = buildContext(state, photoMode);
    const pal = finishPaletteFor(state);
    const configs = finishConfigsFor(state);
    const hasPhoto = !!state.photo.dataUrl;

    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: platform.w,
          height: platform.h,
          overflow: "hidden",
          background: backgroundFor(state),
          // Isolate blend modes (grain / ghost overlay) to this node.
          isolation: "isolate",
          flexShrink: 0,
        }}
      >
        {/* Full-bleed photo sits at the very back — under the finish stack so a
            scrim/grain reads over it. */}
        {photoMode === "fullbleed" && hasPhoto && <FullBleedPhoto spec={state.photo} />}
        <FinishStack finishes={activeFinishes(state)} pal={pal} configs={configs} />
        {/* A carved side panel sits ABOVE the finishes (crisp photo edge) but
            below the content, which reflows off it via ctx.photoZone. */}
        {photoMode === "panel" && hasPhoto && <PhotoPanel spec={state.photo} />}
        {tpl.render(ctx)}
      </div>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
//  BITMAP PREVIEW — smooth photos, preview === export
// ─────────────────────────────────────────────────────────────────────────────
//
//  Downscaling a live DOM subtree with CSS `transform: scale()` uses the browser's
//  low-quality path, so a detailed PHOTO mottles/graininess — worse the smaller the
//  tile. (Icon Kit's old build never hit this: it rendered the banner to a real
//  <canvas> at full resolution and displayed THAT bitmap, which the browser
//  downscales at high quality. Same reason Brand Board is smooth — it shows the
//  exported PNG.)
//
//  So for photo designs we mirror that: render the SAME export PNG (via the
//  off-screen path) once, and show it as an <img> at width:100%. Smooth by
//  construction, and the preview is byte-identical to the export.
//
//  Cost: an async render (~50–150ms) per change, so we debounce and keep the
//  instant live-DOM preview underneath until the crisp bitmap is ready. Text/
//  finish-only designs downscale fine as DOM, so we only pay this when a photo is
//  actually present.

/** A single platform's smooth preview. For photo designs it shows the full-res
 *  export PNG (smooth by construction — same bitmap Brand Board shows), with the
 *  instant live-DOM underneath until the PNG is ready. Text/finish-only designs
 *  stay pure DOM (already crisp). Renders share a cache + queue (useBannerBitmap),
 *  so a cache hit shows immediately with no flicker. */
export function BannerSmartPreview({
  state,
  boxStyle: extraBox,
  radius = 8,
  shadow = true,
}: {
  state: BannerState;
  boxStyle?: CSSProperties;
  radius?: number;
  shadow?: boolean;
}) {
  const platform = getPlatform(state.platform);
  const needsBitmap = !!state.photo.dataUrl;
  const png = useBannerBitmap(state, needsBitmap);

  const box: CSSProperties = {
    width: "100%",
    aspectRatio: `${platform.w} / ${platform.h}`,
    position: "relative",
    borderRadius: radius,
    overflow: "hidden",
    ...(shadow
      ? { boxShadow: "0 20px 45px -25px rgba(20,20,40,0.35), 0 6px 14px -8px rgba(20,20,40,0.12)" }
      : {}),
    ...extraBox,
  };

  return (
    <div style={box}>
      {/* Instant live-DOM layer (also the permanent renderer for no-photo designs). */}
      <div style={{ position: "absolute", inset: 0 }}>
        <ScaledNode state={state} />
      </div>
      {/* Crisp bitmap overlay for photo designs — fades in when ready. */}
      {needsBitmap && png && (
        <img
          src={png}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
    </div>
  );
}

/** A live BannerNode scaled to fill its (relatively-positioned) parent. */
function ScaledNode({ state }: { state: BannerState }) {
  const platform = getPlatform(state.platform);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / platform.w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [platform.w]);
  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={scaledLayerStyle(scale)}>
        <BannerNode state={state} />
      </div>
    </div>
  );
}

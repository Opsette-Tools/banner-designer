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
import { FinishStack } from "./finishes";
import {
  getTemplate,
  buildContext,
  backgroundFor,
  finishPaletteFor,
  finishConfigsFor,
} from "./templates";

/** The banner at true resolution. Ref points at the exportable node. */
export const BannerNode = forwardRef<HTMLDivElement, { state: BannerState }>(
  function BannerNode({ state }, ref) {
    const platform = getPlatform(state.platform);
    const ctx = buildContext(state);
    const tpl = getTemplate(activeTemplateId(state));
    const pal = finishPaletteFor(state);
    const configs = finishConfigsFor(state);

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
        <FinishStack finishes={activeFinishes(state)} pal={pal} configs={configs} />
        {tpl.render(ctx)}
      </div>
    );
  },
);

/**
 * A scaled preview: the true-size BannerNode fit to its container width via CSS
 * transform. Reserves the correct height (by aspect ratio) so layout doesn't jump.
 */
export function BannerPreview({ state }: { state: BannerState }) {
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

  const boxStyle: CSSProperties = {
    width: "100%",
    aspectRatio: `${platform.w} / ${platform.h}`,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 20px 45px -25px rgba(20,20,40,0.35), 0 6px 14px -8px rgba(20,20,40,0.12)",
  };

  return (
    <div ref={wrap} style={boxStyle}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <BannerNode state={state} />
      </div>
    </div>
  );
}

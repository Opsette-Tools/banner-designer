// A tiny live composition thumbnail for the template gallery. Renders the REAL
// BannerNode (same engine as the preview) at Facebook-cover ratio, scaled down —
// so the gallery shows what each template actually IS, not a word.

import { useLayoutEffect, useRef, useState } from "react";
import { BannerNode } from "./BannerCanvas";
import { getPlatform, type BannerState, type TemplateId } from "./model";
import { getTemplate } from "./templates";

export function BannerThumb({ state, templateId }: { state: BannerState; templateId: TemplateId }) {
  // Force the thumb to Facebook ratio + this template's default finish stack, so
  // every card previews the template's designed starting point at a consistent
  // size — regardless of what the live design currently has on Facebook.
  const tpl = getTemplate(templateId);
  const thumbState: BannerState = {
    ...state,
    platform: "facebook",
    templates: { ...state.templates, facebook: templateId },
    platformFinishes: { ...state.platformFinishes, facebook: [...tpl.defaultFinishes] },
  };
  const platform = getPlatform("facebook");
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);

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
    <div
      ref={wrap}
      style={{
        width: "100%",
        aspectRatio: `${platform.w} / ${platform.h}`,
        position: "relative",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <BannerNode state={thumbState} />
      </div>
    </div>
  );
}

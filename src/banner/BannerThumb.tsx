// A tiny composition thumbnail for the template gallery, at Facebook-cover ratio —
// so the gallery shows what each template actually IS, not a word.
//
// Photo templates render the full-res export PNG (cached + queued via
// useBannerBitmap) so the tiny card doesn't mottle the photo — the same fix the
// large preview uses. Non-photo templates stay pure DOM (crisp when downscaled).

import { useLayoutEffect, useRef, useState } from "react";
import { BannerNode, scaledLayerStyle } from "./BannerCanvas";
import { getPlatform, type BannerState, type TemplateId } from "./model";
import { getTemplate } from "./templates";
import { placeholderPhoto } from "./photo";
import { useBannerBitmap } from "./use-banner-bitmap";

export function BannerThumb({ state, templateId }: { state: BannerState; templateId: TemplateId }) {
  // Force the thumb to Facebook ratio + this template's default finish stack, so
  // every card previews the template's designed starting point at a consistent
  // size — regardless of what the live design currently has on Facebook.
  const tpl = getTemplate(templateId);
  // For photo templates with no real photo uploaded yet, stand in a soft
  // placeholder so the card reads as "this holds a photo". If the user HAS a
  // photo, show the real one.
  const usesPhoto = (tpl.photoMode ?? "none") !== "none";
  const photo =
    usesPhoto && !state.photo.dataUrl
      ? { ...state.photo, dataUrl: placeholderPhoto(state.accent, state.ink) }
      : state.photo;
  const thumbState: BannerState = {
    ...state,
    platform: "facebook",
    templates: { ...state.templates, facebook: templateId },
    platformFinishes: { ...state.platformFinishes, facebook: [...tpl.defaultFinishes] },
    photo,
  };
  const platform = getPlatform("facebook");
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);
  // Only the templates that actually carry a photo need the bitmap path.
  const png = useBannerBitmap(thumbState, usesPhoto);

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
      {/* Live-DOM base: instant, and the permanent renderer for non-photo cards. */}
      <div style={scaledLayerStyle(scale)}>
        <BannerNode state={thumbState} />
      </div>
      {/* Crisp bitmap overlay for photo templates. */}
      {usesPhoto && png && (
        <img
          src={png}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </div>
  );
}

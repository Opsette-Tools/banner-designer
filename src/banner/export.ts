// ═══════════════════════════════════════════════════════════════════════════
//  Export — DOM-to-image (model change: replaces the canvas renderer)
// ═══════════════════════════════════════════════════════════════════════════
//
//  The banner is a DOM composition, so export is html-to-image over the SAME node
//  the preview draws (one source → what you see is what exports).
//
//  Format: PNG for graphic-only banners (crisp edges, our default), JPEG ~0.85
//  for photo-bearing ones (a photo as PNG bloats — cf. the 34MB-PDF logo lesson).
//  Today every template is graphic-only (logo is the only raster and it's small),
//  so PNG is the rule; JPEG is wired for when a photo-background template lands.

import { toPng, toJpeg } from "html-to-image";
import { PLATFORMS, type BannerState, type PlatformId, type Platform } from "./model";
import type { SocialAsset } from "@/lib/icon-kit/brand-kit";

/** Does this state carry a raster the export should bake as JPEG? */
function isPhotoBearing(state: BannerState): boolean {
  // A logo is small line-art; only a full-bleed uploaded photo would warrant JPEG.
  // No template uses one yet, so always PNG. Hook kept for the future.
  return false;
}

/** Capture a mounted BannerNode DOM element to a data URL at true resolution. */
export async function nodeToDataUrl(node: HTMLElement, state: BannerState): Promise<string> {
  const opts = {
    // The node is already true-size; pixelRatio 1 keeps the file honest.
    pixelRatio: 1,
    cacheBust: true,
    // Fonts are injected as <link>; give html-to-image the family list so it
    // inlines them. It reads document fonts automatically; nothing extra needed.
  };
  if (isPhotoBearing(state)) return toJpeg(node, { ...opts, quality: 0.85 });
  return toPng(node, opts);
}

/** Convert a data URL to a Blob for download. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function getPlatformDef(id: PlatformId): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}

/**
 * Render the current design at a SPECIFIC platform size, off-screen, and return
 * a SocialAsset (data URL + board label + natural dims). Used to build export
 * assets for every selected platform without disturbing the live preview.
 *
 * We mount an off-screen BannerNode via a temporary React root because
 * html-to-image needs a real, laid-out DOM node — it can't capture from state.
 * The caller (BannerPanel) passes a render function that produces the node.
 */
export async function assetFromNode(
  node: HTMLElement,
  state: BannerState,
  platform: Platform,
): Promise<SocialAsset> {
  const image = await nodeToDataUrl(node, state);
  return {
    image,
    label: platform.boardLabel,
    kind: platform.boardKind,
    width: platform.w,
    height: platform.h,
  };
}

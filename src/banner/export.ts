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

/**
 * Capture a mounted BannerNode DOM element to a data URL at true resolution.
 *
 * `photo` picks the format: PNG for graphic-only banners (crisp edges, our
 * default), JPEG ~0.85 for photo-bearing ones (a photo as PNG bloats — cf. the
 * 34MB-PDF logo lesson). Every template is graphic-only today, so callers pass
 * nothing and get PNG; the JPEG path is ready for when a photo-background
 * template lands (see docs/PHOTO-PANEL-RECIPE.md).
 */
export async function nodeToDataUrl(node: HTMLElement, photo = false): Promise<string> {
  const opts = {
    // The node is already true-size; pixelRatio 1 keeps the file honest.
    pixelRatio: 1,
    cacheBust: true,
    // Skip html-to-image's own web-font embedding pass. That pass walks every
    // stylesheet and reads `.cssRules`, which throws a SecurityError on the
    // cross-origin Google Fonts <link>s (fonts.googleapis.com serves them without
    // CORS). We don't need it: `ensureFonts` already loads AND rasterizes the
    // pairing into `document.fonts` before capture, so the glyphs render from the
    // live FontFaceSet. Turning this off removes the console errors with no visual
    // change to the export.
    skipFonts: true,
  };
  if (photo) return toJpeg(node, { ...opts, quality: 0.85 });
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

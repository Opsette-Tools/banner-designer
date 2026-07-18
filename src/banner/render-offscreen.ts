// Headless banner rendering for export.
//
// html-to-image needs a laid-out DOM node, but the export paths (Brand Board
// blob, embed-save, download-all) may fire without a mounted preview of every
// platform size. So we imperatively mount a BannerNode into a hidden, on-page
// container (off-screen but rendered — display:none can't be captured), wait for
// fonts + a paint, capture it, then unmount.
//
// Everything is deterministic (fixed grain seed, no Math.random), so the same
// state always produces the same pixels.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { BannerNode } from "./BannerCanvas";
import { nodeToDataUrl } from "./export";
import { resolveFonts } from "./template-kit";
import { getPairing, googleHref } from "@/lib/shared-fonts";
import {
  PLATFORMS,
  type BannerState,
  type PlatformId,
  type Platform,
} from "./model";
import type { SocialAsset } from "@/lib/icon-kit/brand-kit";

// Ensure the design's font pairing is loaded AND its glyphs are rasterized before
// capture, or the export falls back to a system font (preview/export mismatch).
async function ensureFonts(state: BannerState): Promise<void> {
  const pair = getPairing(state.fontId);
  const href = googleHref(pair);
  if (typeof document !== "undefined" && !document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  const f = resolveFonts(state.fontId);
  const head = pair.heading.family.includes(" ") ? `"${pair.heading.family}"` : pair.heading.family;
  const body = pair.body.family.includes(" ") ? `"${pair.body.family}"` : pair.body.family;
  try {
    await Promise.all([
      fonts.load(`${f.headingWeight} 80px ${head}`),
      fonts.load(`italic 400 80px ${head}`),
      fonts.load(`${f.bodyWeight} 32px ${body}`),
      fonts.load(`600 24px ${body}`),
    ]);
  } catch {
    /* fall back to whatever's available */
  }
}

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Render one platform off-screen and capture it to a SocialAsset. */
export async function renderPlatformAsset(
  state: BannerState,
  platform: Platform,
): Promise<SocialAsset> {
  await ensureFonts(state);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const scoped: BannerState = { ...state, platform: platform.id };
    const node = await new Promise<HTMLElement>((resolve) => {
      let el: HTMLDivElement | null = null;
      const ref = (n: HTMLDivElement | null) => {
        if (n && !el) {
          el = n;
          resolve(n);
        }
      };
      root.render(createElement(BannerNode, { state: scoped, ref }));
    });
    await nextFrame();
    const image = await nodeToDataUrl(node, scoped);
    return {
      image,
      label: platform.boardLabel,
      kind: platform.boardKind,
      width: platform.w,
      height: platform.h,
    };
  } finally {
    root.unmount();
    host.remove();
  }
}

/** Render a set of platforms (by id) to assets, in order. */
export async function renderAssets(
  state: BannerState,
  platformIds: PlatformId[],
): Promise<SocialAsset[]> {
  const out: SocialAsset[] = [];
  for (const id of platformIds) {
    const platform = PLATFORMS.find((p) => p.id === id);
    if (!platform) continue;
    out.push(await renderPlatformAsset(state, platform));
  }
  return out;
}

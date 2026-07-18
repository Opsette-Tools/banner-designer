// Brand Board export for Banner Designer (social-only).
//
// Brand Board has ONE social slot — a paste REPLACES what's there. Banner
// Designer emits a single `type:"social"` payload of rendered banners plus the
// reopen config (the BannerState). The banner is one composition, so we render
// every platform size into the blob (Facebook cover, OG card, LinkedIn, X).
//
// The panel persists every change to localStorage, so the embed-save path can
// read the live state from there (the active panel also passes its in-memory
// state straight in, which is fresher).

import { toSocialKitJson, type SocialAsset, type SocialConfig, type SocialConfigs } from "./brand-kit";
import { readBannerState, bannerIsDirty } from "@/banner/state";
import { renderAssets } from "@/banner/render-offscreen";
import { PLATFORMS, type BannerState } from "@/banner/model";

export function readSocialState(): BannerState {
  return readBannerState();
}

export interface CombinedExport {
  json: string;
  assetCount: number;
}

const ALL_PLATFORM_IDS = PLATFORMS.map((p) => p.id);

// Build the export blob: rendered banners (all platform sizes) + the reopen
// config. `liveState` is the mounted panel's in-memory state (fresher than
// localStorage) when provided.
export async function buildCombinedExport(
  liveState?: BannerState,
): Promise<CombinedExport> {
  const banner = liveState ?? readBannerState();

  const assets: SocialAsset[] = [];
  if (bannerIsDirty(banner)) {
    assets.push(...(await renderAssets(banner, ALL_PLATFORM_IDS)));
  }

  const configs: SocialConfigs = { social: banner as unknown as SocialConfig };
  const payload = toSocialKitJson(assets, configs);
  return { json: JSON.stringify(payload), assetCount: assets.length };
}

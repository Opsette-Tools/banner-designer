// Banner Designer's adapter for the shared brand-core seed (Mechanism 1 of the
// KIT-SUITE-CONNECT plan). Maps a generic BrandCore — the facts that ride in a
// ?seed= URL — onto the banner builder, so it opens pre-filled with the client's
// name, logo, tagline, and brand color.
//
// The builder hydrates from localStorage and re-mounts on load, so rather than
// thread a seed through props, we merge it into the panel's localStorage key
// BEFORE the panel mounts. It then hydrates from it naturally. The URL param is
// cleared right after, so it applies exactly once.
import type { BrandCore } from "./opsette-kit-link";
import { BANNER_KEY, hydrate, looksLikeBanner } from "@/banner/state";
import { bannerInitial } from "@/banner/model";
import { fromSocialKitJson, configForTab } from "./icon-kit/brand-kit";

function normalizeHex(hex: string): string | null {
  let h = hex.trim();
  if (!h) return null;
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : null;
}

function pickPrimary(core: BrandCore): string | null {
  const colors = core.colors ?? [];
  const primary =
    colors.find((c) => c.role === "primary" || c.role === "base") ?? colors[0];
  return primary ? normalizeHex(primary.hex) : null;
}

function pickAccent(core: BrandCore): string | null {
  const colors = core.colors ?? [];
  const accent = colors.find((c) => c.role === "accent" || c.role === "secondary");
  return accent ? normalizeHex(accent.hex) : null;
}

// Merge a seed onto whatever is saved under BANNER_KEY and write it back. Reading
// the existing value first means a seed only overrides the fields it carries; a
// client's other in-progress choices survive. Fields merge one level deep.
function mergeSeed(patch: Partial<import("@/banner/model").BannerState>, fieldPatch: Record<string, string>): void {
  if (typeof window === "undefined") return;
  let saved: Record<string, unknown> = {};
  try {
    const raw = window.localStorage.getItem(BANNER_KEY);
    if (raw) saved = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    saved = {};
  }
  const current = hydrate(saved as Partial<import("@/banner/model").BannerState>);
  const next = {
    ...current,
    ...patch,
    fields: { ...current.fields, ...fieldPatch },
  };
  try {
    window.localStorage.setItem(BANNER_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/**
 * Apply a decoded brand core to the banner builder (via localStorage). Safe to
 * call once at App mount; a no-op when the core carries nothing usable.
 */
export function applyBannerSeed(core: BrandCore): void {
  const primary = pickPrimary(core);
  const accent = pickAccent(core);
  const logo = core.logo && core.logo.startsWith("data:") ? core.logo : null;

  const patch: Partial<import("@/banner/model").BannerState> = {};
  const fieldPatch: Record<string, string> = {};
  if (core.name) fieldPatch.brand = core.name;
  if (core.tagline) fieldPatch.tagline = core.tagline;
  if (logo) patch.logoDataUrl = logo;
  if (primary) patch.ink = primary;
  if (accent) patch.accent = accent;
  if (core.fonts?.id) patch.fontId = core.fonts.id;

  if (Object.keys(patch).length === 0 && Object.keys(fieldPatch).length === 0) return;
  mergeSeed(patch, fieldPatch);
}

/**
 * Apply a FULL exported "social" blob (Mechanism 3 embed load) to the builder via
 * localStorage, using the same reopen recipe the paste modal uses. Returns
 * "social" if the blob carried a usable config, else null.
 */
export function applyEmbedBlob(raw: string): "social" | null {
  const parsed = fromSocialKitJson(raw);
  if (!parsed) return null;
  const config = configForTab(parsed, "social", looksLikeBanner);
  if (config && typeof window !== "undefined") {
    const merged = hydrate({ ...(config as Partial<import("@/banner/model").BannerState>) });
    try {
      window.localStorage.setItem(BANNER_KEY, JSON.stringify(merged));
      return "social";
    } catch {
      return null;
    }
  }
  return null;
}

// Re-export for any consumer that imported these from here previously.
export { bannerInitial };

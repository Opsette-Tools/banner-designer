// Banner Designer state: reducer + persistence + interop mapping.
//
// The design persists to localStorage and rides in the Brand Board blob (the
// frozen `type:"social"` shape — Brand Board reads `data.assets[]`; reopen reads
// `data.configs.social`). We keep that contract: the stored/blob config IS a
// BannerState, and `looksLikeBanner` claims it for the "social" tab.

import {
  bannerInitial,
  DEFAULT_FIELDS,
  DEFAULT_TEMPLATES,
  DEFAULT_PLATFORM_FINISHES,
  FINISHES,
  PLATFORMS,
  activeFinishes,
  activeTemplateId,
  type BannerState,
  type FieldKey,
  type FinishKind,
  type PlatformId,
  type TemplateId,
} from "./model";
import { getTemplate } from "./templates";

export const BANNER_KEY = "bannerdesigner.v1";

export type BannerAction =
  | { type: "patch"; patch: Partial<BannerState> }
  | { type: "setField"; key: FieldKey; value: string }
  | { type: "selectTemplate"; id: TemplateId }
  | { type: "setPlatform"; id: PlatformId }
  | { type: "toggleFinish"; kind: FinishKind }
  | { type: "moveFinish"; kind: FinishKind; dir: -1 | 1 }
  | { type: "resetFinishes" }
  | { type: "reset" };

const VALID_FINISHES = new Set(FINISHES.map((f) => f.kind));
const PLATFORM_IDS = PLATFORMS.map((p) => p.id);

function cleanFinishes(v: unknown, fallback: FinishKind[]): FinishKind[] {
  return Array.isArray(v)
    ? v.filter((f): f is FinishKind => VALID_FINISHES.has(f as FinishKind))
    : [...fallback];
}

/** Merge a (possibly partial / legacy) stored object onto the defaults so every
 *  field is present and valid. Guards the nested fields/templates/finishes maps.
 *  Also migrates the OLD single-template shape ({templateId, finishes}) onto the
 *  new per-platform maps, so a design saved before mix-and-match still reopens. */
export function hydrate(saved: Partial<BannerState> & { templateId?: TemplateId; finishes?: FinishKind[] } | null | undefined): BannerState {
  const s = saved ?? {};

  // Fields — merge each known key.
  const fields: Record<FieldKey, string> = { ...DEFAULT_FIELDS };
  if (s.fields && typeof s.fields === "object") {
    for (const k of Object.keys(DEFAULT_FIELDS) as FieldKey[]) {
      if (typeof s.fields[k] === "string") fields[k] = s.fields[k];
    }
  }

  // Templates per platform — start from defaults, apply the saved map, and if a
  // legacy single `templateId` is present apply it to every platform.
  const templates: Record<PlatformId, TemplateId> = { ...DEFAULT_TEMPLATES };
  if (s.templates && typeof s.templates === "object") {
    for (const p of PLATFORM_IDS) {
      const t = (s.templates as Record<string, unknown>)[p];
      if (typeof t === "string") templates[p] = t as TemplateId;
    }
  } else if (s.templateId) {
    for (const p of PLATFORM_IDS) templates[p] = s.templateId;
  }

  // Finishes per platform — same story, with a legacy single `finishes` fallback.
  const platformFinishes: Record<PlatformId, FinishKind[]> = {
    facebook: cleanFinishes(s.platformFinishes?.facebook ?? s.finishes, DEFAULT_PLATFORM_FINISHES.facebook),
    og: cleanFinishes(s.platformFinishes?.og ?? s.finishes, DEFAULT_PLATFORM_FINISHES.og),
    linkedin: cleanFinishes(s.platformFinishes?.linkedin ?? s.finishes, DEFAULT_PLATFORM_FINISHES.linkedin),
    twitter: cleanFinishes(s.platformFinishes?.twitter ?? s.finishes, DEFAULT_PLATFORM_FINISHES.twitter),
  };

  return {
    ...bannerInitial,
    ...s,
    templates,
    platformFinishes,
    fields,
    platform: PLATFORM_IDS.includes(s.platform as PlatformId) ? (s.platform as PlatformId) : "facebook",
  };
}

// Write a new finish stack for the ACTIVE platform, leaving the others alone.
function setActiveFinishes(s: BannerState, next: FinishKind[]): BannerState {
  return { ...s, platformFinishes: { ...s.platformFinishes, [s.platform]: next } };
}

export function bannerReducer(s: BannerState, a: BannerAction): BannerState {
  switch (a.type) {
    case "patch":
      return { ...s, ...a.patch };
    case "setField":
      return { ...s, fields: { ...s.fields, [a.key]: a.value } };
    case "selectTemplate": {
      // Selecting a template for the ACTIVE platform swaps to ITS default finish
      // stack (the safe, designed starting point). Other platforms are untouched.
      const tpl = getTemplate(a.id);
      return {
        ...s,
        templates: { ...s.templates, [s.platform]: a.id },
        platformFinishes: { ...s.platformFinishes, [s.platform]: [...tpl.defaultFinishes] },
      };
    }
    case "setPlatform":
      return { ...s, platform: a.id };
    case "toggleFinish": {
      const cur = activeFinishes(s);
      const on = cur.includes(a.kind);
      return setActiveFinishes(s, on ? cur.filter((f) => f !== a.kind) : [...cur, a.kind]);
    }
    case "moveFinish": {
      const cur = activeFinishes(s);
      const i = cur.indexOf(a.kind);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= cur.length) return s;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return setActiveFinishes(s, next);
    }
    case "resetFinishes":
      return setActiveFinishes(s, [...getTemplate(activeTemplateId(s)).defaultFinishes]);
    case "reset":
      return { ...bannerInitial };
  }
}

// ── Interop: claim a stored/blob config as banner state ──────────────────────
/** True if an arbitrary object looks like BannerState (for reopen/embed claim).
 *  Accepts BOTH the current per-platform shape (templates/platformFinishes) and
 *  the legacy single-template shape (templateId/finishes) so old blobs reopen. */
export function looksLikeBanner(c: Record<string, unknown>): boolean {
  if (typeof c !== "object" || c === null) return false;
  if (!("fields" in c)) return false;
  return "templates" in c || "platformFinishes" in c || "templateId" in c || "finishes" in c;
}

/** Read persisted state, hydrated onto defaults. */
export function readBannerState(): BannerState {
  if (typeof window === "undefined") return bannerInitial;
  try {
    const raw = window.localStorage.getItem(BANNER_KEY);
    if (!raw) return bannerInitial;
    return hydrate(JSON.parse(raw) as Partial<BannerState>);
  } catch {
    return bannerInitial;
  }
}

/** Has the design been meaningfully touched (vs. the shipped defaults)? */
export function bannerIsDirty(s: BannerState): boolean {
  return JSON.stringify(s) !== JSON.stringify(bannerInitial);
}

// Shared plumbing every template composition reads: resolved fonts, the palette,
// a field getter that returns "" for empty, and the finish-config type. Kept
// separate from templates.tsx so the .tsx stays composition-only.

import type { CSSProperties } from "react";
import {
  cssFamily,
  getPairing,
  heaviestWeight,
  lightestWeight,
} from "@/lib/shared-fonts";
import type { FieldKey, FinishKind, BannerState, TemplateId, PhotoSpec, PhotoMode } from "./model";
import { activeFinishes } from "./model";
import type { FinishConfig, FinishPalette } from "./finishes";
import { photoTextZone } from "./photo";

export interface ResolvedFonts {
  heading: string; // css font-family stack
  headingWeight: number;
  body: string;
  bodyWeight: number;
}

export function resolveFonts(fontId: string): ResolvedFonts {
  const p = getPairing(fontId);
  return {
    heading: cssFamily(p.heading),
    headingWeight: heaviestWeight(p.heading),
    body: cssFamily(p.body),
    bodyWeight: lightestWeight(p.body),
  };
}

/** Everything a template composition needs, assembled once from state. */
export interface TemplateContext {
  /** Field value or "" — templates rebalance when a value is empty. */
  f: (key: FieldKey) => string;
  has: (key: FieldKey) => boolean;
  logo: string | null;
  fonts: ResolvedFonts;
  accent: string;
  ink: string;
  paper: string;
  /** Active finish stack (already merged: template default + user edits). */
  finishes: FinishKind[];
  /** True when the user has the seam-gradient headline treatment active. */
  seam: boolean;
  /** The shared photo spec (dataUrl may be null). */
  photo: PhotoSpec;
  /** True when this template uses a carved side panel AND a photo is present. */
  hasPanel: boolean;
  /** The clear text zone {x0,x1} in % when a side panel is active, else full
   *  width {0,100}. A template positions its copy inside this so text never
   *  overlaps the photo. */
  photoZone: { x0: number; x1: number };
}

export function buildContext(state: BannerState, photoMode: PhotoMode = "none"): TemplateContext {
  const get = (key: FieldKey) => (state.fields[key] ?? "").trim();
  const finishes = activeFinishes(state);
  const hasPanel = photoMode === "panel" && !!state.photo.dataUrl;
  const photoZone = hasPanel ? photoTextZone(state.photo) : { x0: 0, x1: 100 };
  return {
    f: get,
    has: (key) => get(key).length > 0,
    logo: state.logoDataUrl,
    fonts: resolveFonts(state.fontId),
    accent: state.accent,
    ink: state.ink,
    paper: state.paper,
    finishes,
    seam: finishes.includes("seam-gradient"),
    photo: state.photo,
    hasPanel,
    photoZone,
  };
}

/** A template definition: metadata, which fields it routes, its default finish
 *  stack + per-finish tuning, and the composition renderer. */
export interface TemplateDef {
  id: TemplateId;
  name: string;
  purpose: string; // one-line "what it's for" shown in the gallery
  /** Fields this template surfaces in the editor, in editor order. */
  fields: FieldKey[];
  /** Whether this template uses the logo upload. */
  usesLogo: boolean;
  /** How this template consumes the shared photo: a carved side panel, a
   *  full-bleed background, or none. Drives whether the Photo control shows and
   *  whether the render node paints the photo. Defaults to "none". */
  photoMode?: PhotoMode;
  /** The finish stack a fresh pick of this template gets. */
  defaultFinishes: FinishKind[];
  /** The finishes that VISIBLY do something on this template — the only ones the
   *  editor offers for it. Prevents dead toggles (a finish the template can't
   *  express). Defaults (when omitted) to all finishes except seam-gradient,
   *  which is a headline treatment only some templates render. */
  applicableFinishes?: FinishKind[];
  /** The base color the banner sits on — feeds finish light/dark decisions. */
  baseColor: (ctx: TemplateContext) => string;
  /** The base background layer (solid / gradient / radial) drawn under everything. */
  background: (ctx: TemplateContext) => CSSProperties["background"];
  /** Per-finish tuning for this template's look. */
  finishConfigs: (ctx: TemplateContext) => Partial<Record<FinishKind, FinishConfig>>;
  /** The palette a finish reads (base is resolved from baseColor). */
  palette?: (ctx: TemplateContext) => Partial<FinishPalette>;
}

// Small shared style atoms so every template's meta lines read consistently.
export const eyebrowStyle = (color: string, fonts: ResolvedFonts, size = 13): CSSProperties => ({
  fontFamily: fonts.body,
  fontWeight: 600,
  fontSize: size,
  textTransform: "uppercase",
  letterSpacing: "0.32em",
  color,
  lineHeight: 1.2,
});

export const metaStyle = (color: string, fonts: ResolvedFonts, size = 12): CSSProperties => ({
  fontFamily: fonts.body,
  fontWeight: 500,
  fontSize: size,
  textTransform: "uppercase",
  letterSpacing: "0.28em",
  color,
  lineHeight: 1.3,
});

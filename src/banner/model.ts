// ═══════════════════════════════════════════════════════════════════════════
//  BANNER DESIGNER — the design model (ONE source of truth)
// ═══════════════════════════════════════════════════════════════════════════
//
//  The old Icon Kit model was "one background + text fields + ONE texture." That
//  can't express a real composition. This model replaces it with three moving
//  parts (see docs/BANNER-DESIGNER-BUILD-SPEC.md §"THE THREE MODEL CHANGES"):
//
//    1. SMART FIELDS — content inputs that each TEMPLATE routes to its own slot.
//    2. FINISHES — a composable, ordered stack of layers (multiselect), not one
//       dropdown. This is what makes a banner look designed.
//    3. TEMPLATES — purpose-driven compositions picked from a visual gallery.
//
//  Everything the editor and the renderer agree on lives here so a new field,
//  finish, or platform size is added in exactly one place.

// ── Smart fields ─────────────────────────────────────────────────────────────
// Every content input the tool knows. A template declares which of these it
// uses (its slot map); the editor only shows fields the active template routes.

export type FieldKey =
  | "brand"      // business / brand name
  | "eyebrow"    // small role / location line
  | "headline"   // the hero line
  | "tagline"    // supporting line under the headline
  | "offer"      // the promo value — renders as the ghost-hero on Promotion ($99)
  | "cta"        // call-to-action text (button / pill)
  | "promoCode"  // discount code
  | "contact"    // phone / address line
  | "website"    // url
  | "quote"      // a testimonial / pull-quote line
  | "attribution" // who said the quote (name, role)
  | "detail";    // a date / time / location / secondary detail line

export interface FieldDef {
  key: FieldKey;
  label: string;
  placeholder: string;
  /** A longer field wants a textarea-ish hint; here just a size cue for layout. */
  long?: boolean;
}

export const FIELDS: Record<FieldKey, FieldDef> = {
  brand: { key: "brand", label: "Business name", placeholder: "Providence Care Plus" },
  eyebrow: { key: "eyebrow", label: "Eyebrow", placeholder: "New patient offer · Limited time" },
  headline: { key: "headline", label: "Headline", placeholder: "A full first visit, for ninety-nine.", long: true },
  tagline: { key: "tagline", label: "Tagline", placeholder: "Functional medicine with a board-certified NP.", long: true },
  offer: { key: "offer", label: "Offer", placeholder: "$99" },
  cta: { key: "cta", label: "Call to action", placeholder: "Book a free consultation" },
  promoCode: { key: "promoCode", label: "Promo code", placeholder: "WELLNESS99" },
  contact: { key: "contact", label: "Contact line", placeholder: "(503) 555 · 0198" },
  website: { key: "website", label: "Website", placeholder: "providencecareplus.com" },
  quote: { key: "quote", label: "Quote", placeholder: "The best care I've had in years.", long: true },
  attribution: { key: "attribution", label: "Attributed to", placeholder: "Maria G. · Patient since 2021" },
  detail: { key: "detail", label: "Detail line", placeholder: "Saturday, May 18 · 10am–2pm" },
};

/** The uploaded logo (data URL) — separate from text fields; not every template uses it. */

// ── Photo ────────────────────────────────────────────────────────────────────
// A single uploaded photo, shared across platforms like the logo/colors/fonts.
// Two templates consume it in different ways:
//   • PANEL   — the photo is carved into ONE side behind a shaped seam (a
//               "meet the team" / product-hero look). Uses `side` + `divider`.
//   • FULLBLEED — the photo fills the whole banner behind a scrim (a mood /
//               quote / event look). Ignores `side` + `divider`.
// A template declares which mode it wants (its `photoMode`); the SAME PhotoSpec
// feeds both. `zoom` + `focusX/Y` frame the crop so a face stays in view — the
// focal dot in the editor sets focusX/Y directly.

export type PhotoDivider = "straight" | "diagonal" | "curve";

export interface PhotoSpec {
  /** The uploaded image as a data URL, or null when none. */
  dataUrl: string | null;
  /** Which side the carved PANEL occupies (ignored in full-bleed). */
  side: "left" | "right";
  /** The seam shape between the panel and the text (ignored in full-bleed). */
  divider: PhotoDivider;
  /** Cover-scale multiplier: 1 = fill, up to 2.5 = punch in. */
  zoom: number;
  /** Focal point 0..1 — what stays visible when the photo is cropped. */
  focusX: number; // 0 = left edge, 1 = right edge
  focusY: number; // 0 = top edge, 1 = bottom edge
}

export const DEFAULT_PHOTO: PhotoSpec = {
  dataUrl: null,
  side: "left",
  divider: "diagonal",
  zoom: 1,
  focusX: 0.5,
  focusY: 0.35, // faces sit slightly above center — this frames them by default
};

/** How a template consumes the shared photo (if at all). */
export type PhotoMode = "none" | "panel" | "fullbleed";

// ── Finishes ─────────────────────────────────────────────────────────────────
// The composable layer stack. Each finish is a self-contained visual layer,
// tint-driven by the accent color, drawn in order BEHIND the content. A template
// ships a sensible DEFAULT stack; the user adds / removes / reorders.

export type FinishKind =
  | "diagonal-split"   // clipPath color panel — the signature move
  | "scrim"            // gradient darkening behind text (legibility)
  | "ghost-text"       // oversized low-alpha / stroked word behind content
  | "seam-gradient"    // background-clip:text headline split at the seam
  | "grain"            // feTurbulence noise, faint, mix-blend-overlay
  | "blur-blob"        // soft radial accent blob
  | "keyline";         // thin inset frame / rule

export interface FinishDef {
  kind: FinishKind;
  label: string;
  hint: string;
}

export const FINISHES: FinishDef[] = [
  { kind: "diagonal-split", label: "Diagonal split", hint: "An angled accent panel across the banner." },
  { kind: "scrim", label: "Scrim", hint: "Darkens behind the text so it stays readable." },
  { kind: "ghost-text", label: "Ghost word", hint: "A giant faint word or number behind the content." },
  { kind: "seam-gradient", label: "Seam gradient text", hint: "The headline changes color at the split." },
  { kind: "grain", label: "Grain", hint: "Fine film grain over everything." },
  { kind: "blur-blob", label: "Accent glow", hint: "A soft blurred blob of color for depth." },
  { kind: "keyline", label: "Keyline frame", hint: "A thin inset border." },
];

export function finishLabel(kind: FinishKind): string {
  return FINISHES.find((f) => f.kind === kind)?.label ?? kind;
}

// ── Platforms ────────────────────────────────────────────────────────────────
// The output sizes. Facebook cover + OG card are the two the spec says to verify
// every template against; LinkedIn + X round out the common set. The design
// renders at these exact pixel dimensions (the export node's true size).

export type PlatformId = "facebook" | "og" | "linkedin" | "twitter";

export interface Platform {
  id: PlatformId;
  label: string;
  w: number;
  h: number;
  file: string;
  /** Board asset label + kind hint when exported. */
  boardLabel: string;
  boardKind: string;
}

export const PLATFORMS: Platform[] = [
  { id: "facebook", label: "Facebook cover", w: 1584, h: 396, file: "facebook-cover.png", boardLabel: "Facebook cover", boardKind: "banner" },
  { id: "og", label: "Social card (OG)", w: 1200, h: 630, file: "og-image.png", boardLabel: "Social card", boardKind: "card" },
  { id: "linkedin", label: "LinkedIn cover", w: 1584, h: 396, file: "linkedin-banner.png", boardLabel: "LinkedIn banner", boardKind: "banner" },
  { id: "twitter", label: "X / Twitter header", w: 1500, h: 500, file: "twitter-header.png", boardLabel: "X header", boardKind: "banner" },
];

export function getPlatform(id: PlatformId): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}

// ── The template registry (ids only here; compositions live in templates.tsx) ─
export type TemplateId =
  | "promotion"
  | "cta"
  | "credential"
  | "brand-story"
  | "logo"
  | "typographic"
  | "color-blocked"
  | "editorial"
  // ── photo templates (added 2026-07-18) ──
  | "team-intro"
  | "product-hero"
  | "quote"
  | "event"
  | "split-feature"
  // ── non-photo templates (added 2026-07-18) ──
  | "announcement"
  | "testimonial"
  | "menu"
  | "countdown"
  | "wordmark"
  | "stat";

// ── The full design state ────────────────────────────────────────────────────
// This is what persists (localStorage) and what rides in the reopen/export blob.
// It carries EVERY field's value (unused-by-template fields are simply hidden in
// the editor and ignored by the renderer), plus the accent/font/finish choices.

export interface BannerState {
  /** Which platform the editor is currently focused on (drives the preview). */
  platform: PlatformId;

  // Per-platform template + finish stack. The brand is ONE (shared content,
  // colors, fonts, logo below) but each platform can wear a DIFFERENT template
  // and finish stack — a Promotion Facebook cover next to an Editorial OG card.
  templates: Record<PlatformId, TemplateId>;
  platformFinishes: Record<PlatformId, FinishKind[]>;

  // Content — one value per field key, SHARED across platforms. A template reads
  // only the keys it maps.
  fields: Record<FieldKey, string>;

  // Uploaded logo (data URL) — used by templates that map a logo slot.
  logoDataUrl: string | null;

  // Uploaded photo + its framing (shared). Consumed by photo templates as a
  // carved side panel or a full-bleed background; ignored by the rest.
  photo: PhotoSpec;

  // Palette (shared). accent tints finishes + accent words; ink is the deep base
  // color; paper is the light base. Templates decide which they lean on.
  accent: string;
  ink: string;
  paper: string;

  // Type (shared). One pairing id from the shared font library (heading + body).
  fontId: string;
}

// A brand-neutral default so an untouched tool still shows a real design (forest
// + gold, matching the reference client and Ruthnie's own palette).
export const DEFAULT_FIELDS: Record<FieldKey, string> = {
  brand: "Providence Care Plus",
  eyebrow: "New patient offer · Limited time",
  headline: "A full first visit, for ninety-nine.",
  tagline: "Functional medicine with a board-certified nurse practitioner.",
  offer: "$99",
  cta: "Book a free consultation",
  promoCode: "WELLNESS99",
  contact: "(503) 555 · 0198",
  website: "providencecareplus.com",
  quote: "The best care I've had in years — I actually feel heard.",
  attribution: "Maria G. · Patient since 2021",
  detail: "Saturday, May 18 · 10am – 2pm",
};

// A pleasant default template per platform — varied so a fresh open already
// shows the mix-and-match idea (Facebook color-blocked, OG editorial, etc).
export const DEFAULT_TEMPLATES: Record<PlatformId, TemplateId> = {
  facebook: "team-intro",
  og: "promotion",
  linkedin: "cta",
  twitter: "brand-story",
};

// Each platform's default finish stack = its template's default (filled in below
// to avoid a circular import with templates.ts). See bannerInitial.
export const DEFAULT_PLATFORM_FINISHES: Record<PlatformId, FinishKind[]> = {
  facebook: ["blur-blob"],
  og: ["ghost-text", "blur-blob"],
  linkedin: ["diagonal-split", "ghost-text", "grain"],
  twitter: ["scrim", "blur-blob"],
};

export const bannerInitial: BannerState = {
  platform: "facebook",
  templates: { ...DEFAULT_TEMPLATES },
  platformFinishes: {
    facebook: [...DEFAULT_PLATFORM_FINISHES.facebook],
    og: [...DEFAULT_PLATFORM_FINISHES.og],
    linkedin: [...DEFAULT_PLATFORM_FINISHES.linkedin],
    twitter: [...DEFAULT_PLATFORM_FINISHES.twitter],
  },
  fields: { ...DEFAULT_FIELDS },
  logoDataUrl: null,
  photo: { ...DEFAULT_PHOTO },
  accent: "#c8a46b", // gold
  ink: "#1b4d3e", // forest
  paper: "#f6f1e7", // cream
  fontId: "fraunces-nunito",
};

// ── Active-view resolvers ────────────────────────────────────────────────────
// The rest of the engine (templates.tsx, finishes) reasons about ONE template +
// ONE finish stack. These resolve the CURRENTLY-FOCUSED platform's choices so
// that code needs no per-platform awareness.

export function activeTemplateId(s: BannerState): TemplateId {
  return s.templates[s.platform] ?? "color-blocked";
}

export function activeFinishes(s: BannerState): FinishKind[] {
  return s.platformFinishes[s.platform] ?? [];
}

/** The template + finishes for a SPECIFIC platform (used by export/thumbs). */
export function templateFor(s: BannerState, platform: PlatformId): TemplateId {
  return s.templates[platform] ?? "color-blocked";
}
export function finishesFor(s: BannerState, platform: PlatformId): FinishKind[] {
  return s.platformFinishes[platform] ?? [];
}

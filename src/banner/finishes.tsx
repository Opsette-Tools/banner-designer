// ═══════════════════════════════════════════════════════════════════════════
//  FINISH LAYERS — the composable, ordered stack (model change #2)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Each finish is a self-contained absolutely-positioned layer, tint-driven by
//  the palette, drawn BEHIND the content. A template supplies a default ordered
//  stack and per-finish config (the same finish looks different on CTA vs
//  Color-blocked — the config is how). The user can add / drop / reorder.
//
//  Everything is DOM/CSS/SVG — the whole point of the rebuild. Overlap and
//  layering are free here; canvas made them too tedious.
//
//  No Math.random: the grain seed is fixed (deterministic export, per house rule).

import type { CSSProperties, ReactElement } from "react";
import type { FinishKind } from "./model";
import { alpha, lighten, darken, isLight } from "./palette";

/** The palette a finish reads. Passed down from the template composition. */
export interface FinishPalette {
  accent: string;
  ink: string;
  paper: string;
  /** The base color the banner sits on — decides whether finishes go light or dark. */
  base: string;
  /** A word to fall back to when a finish needs text but the template gave none
   *  (e.g. Ghost word on a template that doesn't set ghostText). Keeps every
   *  finish visibly working on every template it's offered for. */
  brandWord?: string;
}

/** Per-finish tuning a template can override. All optional; sensible defaults. */
export interface FinishConfig {
  // diagonal-split
  splitStart?: number; // % across the top where the diagonal begins (default 58)
  splitEnd?: number; // % across the bottom (default 42) — controls the angle
  splitColor?: string; // panel fill (default accent)
  splitFrom?: "left" | "right"; // which side the panel occupies (default right)
  splitGradientTo?: string; // if set, the panel is a gradient to this color
  // scrim
  scrimSide?: "left" | "right" | "bottom" | "full"; // gradient direction (default left)
  scrimStrength?: number; // peak darkness 0..1 (default 0.72)
  // ghost-text
  ghostText?: string; // the word/number to ghost (template supplies from a field)
  ghostSize?: number; // font size in px at design scale (default 340)
  ghostAlpha?: number; // fill alpha (default 0.07)
  ghostStroke?: boolean; // outline instead of fill (the "$99" trick)
  ghostX?: number; // left position % (default -2)
  ghostY?: number; // vertical center % (default 50)
  ghostAlign?: "left" | "right";
  ghostFont?: string; // css font-family (default heavy display)
  // grain
  grainAlpha?: number; // overlay opacity (default 0.08)
  // blur-blob
  blobColor?: string; // default accent
  blobX?: number; // center % (default 15)
  blobY?: number; // center % (default 25)
  blobSize?: number; // diameter as % of width (default 55)
  blobAlpha?: number; // default 0.5
  // keyline
  keyColor?: string; // default a muted ink/paper
  keyInset?: number; // inset % (default 3)
}

const FULL: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

// ── diagonal-split ────────────────────────────────────────────────────────────
function DiagonalSplit({ pal, cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  const start = cfg.splitStart ?? 58;
  const end = cfg.splitEnd ?? 42;
  const from = cfg.splitFrom ?? "right";
  const color = cfg.splitColor ?? pal.accent;
  const fill = cfg.splitGradientTo
    ? `linear-gradient(155deg, ${color} 0%, ${cfg.splitGradientTo} 100%)`
    : color;
  // Right panel: top-left corner sits at `start`%, bottom-left at `end`%.
  // Left panel is the mirror.
  const clip =
    from === "right"
      ? `polygon(${start}% 0, 100% 0, 100% 100%, ${end}% 100%)`
      : `polygon(0 0, ${100 - start}% 0, ${100 - end}% 100%, 0 100%)`;
  return <div aria-hidden style={{ ...FULL, background: fill, clipPath: clip }} />;
}

// ── scrim ─────────────────────────────────────────────────────────────────────
function Scrim({ pal, cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  const side = cfg.scrimSide ?? "left";
  const s = cfg.scrimStrength ?? 0.72;
  const dark = isLight(pal.base) ? "#0e1a17" : darken(pal.ink, 0.35);
  const dir =
    side === "left"
      ? "105deg"
      : side === "right"
        ? "255deg"
        : side === "bottom"
          ? "0deg"
          : "180deg";
  const bg =
    side === "full"
      ? alpha(dark, s * 0.7)
      : `linear-gradient(${dir}, ${alpha(dark, s)} 0%, ${alpha(dark, s * 0.4)} 45%, ${alpha(dark, 0)} 72%)`;
  return <div aria-hidden style={{ ...FULL, background: bg }} />;
}

// ── ghost-text ────────────────────────────────────────────────────────────────
function GhostText({ pal, cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  // Fall back to the brand's first word so the finish always renders SOMETHING
  // when the user adds it, even on a template that doesn't configure a ghost word.
  const text = ((cfg.ghostText ?? "").trim() || (pal.brandWord ?? "").trim());
  if (!text) return null;
  const size = cfg.ghostSize ?? 340;
  const a = cfg.ghostAlpha ?? 0.07;
  const stroke = cfg.ghostStroke ?? false;
  const align = cfg.ghostAlign ?? "left";
  const x = cfg.ghostX ?? -2;
  const y = cfg.ghostY ?? 50;
  const tint = isLight(pal.base) ? darken(pal.ink, 0.1) : "#ffffff";
  const style: CSSProperties = {
    position: "absolute",
    top: `${y}%`,
    transform: "translateY(-50%)",
    fontSize: size,
    fontWeight: 900,
    lineHeight: 0.78,
    letterSpacing: "-0.05em",
    whiteSpace: "nowrap",
    userSelect: "none",
    pointerEvents: "none",
    fontFamily: cfg.ghostFont ?? '"Archivo", system-ui, sans-serif',
    ...(align === "right" ? { right: `${x}%` } : { left: `${x}%` }),
    ...(stroke
      ? { color: "transparent", WebkitTextStroke: `2px ${alpha(tint, Math.max(a, 0.4))}`, mixBlendMode: "overlay" }
      : { color: alpha(tint, a) }),
  };
  return (
    <div aria-hidden style={style}>
      {text}
    </div>
  );
}

// ── grain ─────────────────────────────────────────────────────────────────────
// Inline SVG feTurbulence with a fixed seed. Rendered as a background-image data
// URI so html-to-image bakes it cleanly.
const GRAIN_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.7'/></svg>`,
  );
function Grain({ cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  return (
    <div
      aria-hidden
      style={{
        ...FULL,
        opacity: cfg.grainAlpha ?? 0.08,
        mixBlendMode: "overlay",
        backgroundImage: `url("${GRAIN_URI}")`,
        backgroundSize: "160px 160px",
      }}
    />
  );
}

// ── blur-blob ─────────────────────────────────────────────────────────────────
function BlurBlob({ pal, cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  const color = cfg.blobColor ?? lighten(pal.accent, 0.15);
  const x = cfg.blobX ?? 15;
  const y = cfg.blobY ?? 25;
  const size = cfg.blobSize ?? 55;
  const a = cfg.blobAlpha ?? 0.5;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        filter: "blur(70px)",
        opacity: a,
        background: `radial-gradient(closest-side, ${color}, transparent 72%)`,
        pointerEvents: "none",
      }}
    />
  );
}

// ── keyline ─────────────────────────────────────────────────────────────────
function Keyline({ pal, cfg }: { pal: FinishPalette; cfg: FinishConfig }) {
  const inset = cfg.keyInset ?? 3;
  const color = cfg.keyColor ?? alpha(isLight(pal.base) ? pal.ink : pal.paper, 0.28);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: `${inset}%`,
        border: `1px solid ${color}`,
        pointerEvents: "none",
      }}
    />
  );
}

// seam-gradient is NOT a background layer — it's a text treatment applied to the
// headline itself. It's declared as a finish (so it shows in the stack), but the
// composition reads whether it's active and styles the headline accordingly.
// See templates.tsx (headlineSeamStyle). The layer renderer no-ops for it.

const LAYER: Record<
  Exclude<FinishKind, "seam-gradient">,
  (p: { pal: FinishPalette; cfg: FinishConfig }) => ReactElement | null
> = {
  "diagonal-split": DiagonalSplit,
  scrim: Scrim,
  "ghost-text": GhostText,
  grain: Grain,
  "blur-blob": BlurBlob,
  keyline: Keyline,
};

/**
 * Render the active finish stack as ordered layers. `configs` maps a finish kind
 * to its per-template tuning. Order = draw order (first = furthest back).
 * seam-gradient produces no layer (it's a headline treatment).
 */
export function FinishStack({
  finishes,
  pal,
  configs,
}: {
  finishes: FinishKind[];
  pal: FinishPalette;
  configs: Partial<Record<FinishKind, FinishConfig>>;
}) {
  return (
    <>
      {finishes.map((kind, i) => {
        if (kind === "seam-gradient") return null;
        const Comp = LAYER[kind];
        return <Comp key={`${kind}-${i}`} pal={pal} cfg={configs[kind] ?? {}} />;
      })}
    </>
  );
}

/** Does the active stack include the seam-gradient headline treatment? */
export function hasSeam(finishes: FinishKind[]): boolean {
  return finishes.includes("seam-gradient");
}

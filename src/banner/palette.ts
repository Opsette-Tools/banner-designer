// Color helpers for the composition engine. The WCAG contrast + mute math is
// reused from the Icon Kit design module (it generalizes); the tint/alpha
// helpers are new — the finish layers are all tint-driven by the accent color.

import { hexToRgb, contrastRatio, muteColor } from "@/lib/icon-kit/social-design";

export { hexToRgb, contrastRatio, muteColor };

/** A hex color at a given alpha, as an rgba() string. amount 0..1. */
export function alpha(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, amount));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mix a hex toward white by amount (0 = unchanged, 1 = white) — a lighter tint. */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, amount));
  const mix = (c: number) => Math.round(c + (255 - c) * a);
  return rgbHex(mix(r), mix(g), mix(b));
}

/** Mix a hex toward black by amount (0 = unchanged, 1 = black) — a darker shade. */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, amount));
  const mix = (c: number) => Math.round(c * (1 - a));
  return rgbHex(mix(r), mix(g), mix(b));
}

/** Relative luminance 0..1 (perceptual-ish, quick) — is this color light? */
export function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/** Best readable text color (near-white or near-black) against a background. */
export function readableOn(bg: string): string {
  return contrastRatio("#ffffff", bg) >= contrastRatio("#111111", bg) ? "#ffffff" : "#111111";
}

function rgbHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

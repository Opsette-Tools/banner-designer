// ═══════════════════════════════════════════════════════════════════════════
//  THE 8 TEMPLATES — purpose-driven compositions (model change #3)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Each is a slot-mapped composition parameterized from the fields + palette +
//  fonts, rebuilt from the proven Lovable designs (icon-kit/brand-showcase) but
//  driven by data instead of hardcoded. Every template:
//    • declares which FIELDS it routes (the editor shows only those),
//    • ships a DEFAULT finish stack + per-finish tuning,
//    • renders content ABOVE the finish stack (which the BannerCanvas draws).
//
//  Sizes are absolute px at a fixed DESIGN WIDTH (see BannerCanvas: 1584 wide).
//  BannerCanvas scales the whole node to the target platform, so one set of px
//  values reads correctly on every size. Templates use % for position, px for type.

import type { CSSProperties, ReactNode } from "react";
import type { FinishConfig, FinishPalette } from "./finishes";
import type { FieldKey, FinishKind, TemplateId } from "./model";
import { activeTemplateId } from "./model";
import {
  buildContext,
  eyebrowStyle,
  metaStyle,
  type TemplateContext,
  type TemplateDef,
} from "./template-kit";
import { alpha, darken, lighten, readableOn, isLight, muteColor } from "./palette";
import type { BannerState } from "./model";

// Content layer sits above the finishes; padded by a template-chosen inset.
function Content({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", ...style }}>{children}</div>
  );
}

// A headline that can render its LAST accent word emphasized, and optionally
// take the seam-gradient treatment. The `accentWord` is the last word by default;
// the composition can pass a specific slice. Kept here so several templates share it.
function AccentHeadline({
  text,
  fonts,
  color,
  accent,
  fontSize,
  italicAccent = true,
  weight,
  seam,
  seamLeft,
  seamRight,
  align = "left",
  lineHeight = 0.98,
  maxWidth,
}: {
  text: string;
  fonts: TemplateContext["fonts"];
  color: string;
  accent: string;
  fontSize: number;
  italicAccent?: boolean;
  weight?: number;
  seam?: boolean;
  seamLeft?: string;
  seamRight?: string;
  align?: CSSProperties["textAlign"];
  lineHeight?: number;
  maxWidth?: number | string;
}) {
  const base: CSSProperties = {
    fontFamily: fonts.heading,
    fontWeight: weight ?? fonts.headingWeight,
    fontSize,
    lineHeight,
    letterSpacing: "-0.02em",
    textAlign: align,
    margin: 0,
    maxWidth,
  };
  // Seam gradient: the whole headline is a hard 50/50 background-clip split.
  if (seam && seamLeft && seamRight) {
    return (
      <h2
        style={{
          ...base,
          background: `linear-gradient(to right, ${seamLeft} 0%, ${seamLeft} 50%, ${seamRight} 50%, ${seamRight} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {text}
      </h2>
    );
  }
  // Accent the last word.
  const words = text.split(" ");
  if (words.length < 2) {
    return (
      <h2 style={{ ...base, color }}>{text}</h2>
    );
  }
  const head = words.slice(0, -1).join(" ");
  const last = words[words.length - 1];
  return (
    <h2 style={{ ...base, color }}>
      {head}{" "}
      <span
        style={{
          color: accent,
          fontStyle: italicAccent ? "italic" : "normal",
          fontWeight: italicAccent ? 400 : (weight ?? fonts.headingWeight),
        }}
      >
        {last}
      </span>
    </h2>
  );
}

// ── 1. PROMOTION ──────────────────────────────────────────────────────────────
// Offer is the giant ghost-hero ($99); radial bg, eyebrow top, name+detail bottom.
function Promotion({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = darken(ink, 0.15);
  const muted = muteColor(text, 0.3);
  return (
    <Content style={{ flexDirection: "column", justifyContent: "space-between", padding: "4%" }}>
      {has("eyebrow") && (
        <div style={eyebrowStyle(alpha(ink, 0.85), fonts, 15)}>{f("eyebrow")}</div>
      )}
      {has("headline") && (
        <AccentHeadline
          text={f("headline")}
          fonts={fonts}
          color={text}
          accent={darken(ink, 0.05)}
          fontSize={72}
          italicAccent
          weight={300}
          maxWidth="72%"
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          fontFamily: fonts.body,
          color: alpha(text, 0.85),
        }}
      >
        <div>
          {has("brand") && (
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.02em" }}>{f("brand")}</div>
          )}
          {has("tagline") && (
            <div style={{ fontSize: 16, opacity: 0.75, marginTop: 2 }}>{f("tagline")}</div>
          )}
        </div>
        {has("promoCode") && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Use code</div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.16em", color: darken(accent, 0.15) }}>
              {f("promoCode")}
            </div>
          </div>
        )}
      </div>
    </Content>
  );
}

// ── 2. CALL TO ACTION ──────────────────────────────────────────────────────────
// Deep base + diagonal accent panel right; CTA as a real pill; accent italic word;
// faint ghost word behind; grain.
function CallToAction({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onDark = "#ffffff";
  return (
    <Content
      style={{
        alignItems: "center",
        padding: "4%",
        gap: "3%",
        display: "grid",
        gridTemplateColumns: has("cta") ? "1.15fr 1fr" : "1fr",
      }}
    >
      <div style={{ color: onDark }}>
        {has("brand") && (
          <div style={{ ...eyebrowStyle(alpha(onDark, 0.6), fonts, 13), marginBottom: 14 }}>{f("brand")}</div>
        )}
        {has("headline") && (
          <AccentHeadline
            text={f("headline")}
            fonts={fonts}
            color={onDark}
            accent={lighten(accent, 0.25)}
            fontSize={66}
            weight={400}
            maxWidth="94%"
          />
        )}
        {has("tagline") && (
          <div
            style={{
              marginTop: 18,
              maxWidth: "80%",
              fontFamily: fonts.body,
              fontSize: 18,
              lineHeight: 1.35,
              color: alpha(onDark, 0.72),
            }}
          >
            {f("tagline")}
          </div>
        )}
      </div>
      {has("cta") && (
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
          <div>
            {/* A pill that LOOKS like a CTA button. Rendered as a div, not a
                real <button>, so the whole banner can itself be a clickable
                thumbnail (a button can't nest a button). */}
            <div
              role="presentation"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 999,
                background: darken(ink, 0.1),
                color: onDark,
                padding: "18px 30px",
                fontFamily: fonts.body,
                fontWeight: 600,
                fontSize: 20,
                boxShadow: `0 14px 34px -12px ${alpha(ink, 0.7)}`,
              }}
            >
              {f("cta")}
              <span aria-hidden style={{ color: lighten(accent, 0.2) }}>→</span>
            </div>
            {has("contact") && (
              <div style={{ ...metaStyle(darken(ink, 0.05), fonts, 13), marginTop: 14, textAlign: "center" }}>
                {f("contact")}
              </div>
            )}
          </div>
        </div>
      )}
    </Content>
  );
}

// ── 3. CREDENTIAL (strengthened) ───────────────────────────────────────────────
// The weakest in the old set — rebuilt as a confident hero. The credential reads
// BIG next to the name, an oversized ghost of the credential sits behind for
// depth, a blurred accent blob anchors the left, keyline frames it. Not a rule.
function Credential({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = darken(ink, 0.2);
  const cred = f("offer"); // the credential letters live in Offer for this template
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 6%" }}>
      {has("eyebrow") && (
        <div style={{ ...metaStyle(darken(accent, 0.25), fonts, 14), marginBottom: 18 }}>{f("eyebrow")}</div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 28, flexWrap: "wrap" }}>
        {has("brand") && (
          <h2
            style={{
              fontFamily: fonts.heading,
              fontWeight: 400,
              fontSize: 84,
              lineHeight: 0.92,
              letterSpacing: "-0.02em",
              color: text,
              margin: 0,
            }}
          >
            {f("brand")}
          </h2>
        )}
        {cred && (
          <span
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 96,
              lineHeight: 0.9,
              letterSpacing: "-0.01em",
              color: accent,
              margin: 0,
            }}
          >
            {cred}
          </span>
        )}
      </div>
      {has("tagline") && (
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 26 }}>
          <div style={{ height: 2, width: 70, background: accent }} />
          <div style={metaStyle(darken(text, 0.05), fonts, 15)}>{f("tagline")}</div>
        </div>
      )}
    </Content>
  );
}

// ── 4. BRAND STORY (photo-forward) ─────────────────────────────────────────────
// Layered gradient (or uploaded photo) + scrim behind an italic headline;
// secondary mark top-right.
function BrandStory({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const onDark = "#ffffff";
  return (
    <Content style={{ alignItems: "flex-end", justifyContent: "space-between", padding: "4%" }}>
      <div style={{ maxWidth: "64%", color: onDark }}>
        {has("eyebrow") && (
          <div style={{ ...metaStyle(alpha(onDark, 0.75), fonts, 14), marginBottom: 16 }}>{f("eyebrow")}</div>
        )}
        {has("headline") && (
          <h2
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 72,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: onDark,
              margin: 0,
            }}
          >
            {f("headline")}
          </h2>
        )}
      </div>
      <div style={{ alignSelf: "flex-start", textAlign: "right", color: onDark }}>
        {has("brand") && (
          <div style={{ fontFamily: fonts.heading, fontStyle: "italic", fontSize: 30, lineHeight: 1 }}>
            {f("brand")}
          </div>
        )}
        {has("tagline") && (
          <div style={{ ...metaStyle(alpha(onDark, 0.65), fonts, 12), marginTop: 8 }}>{f("tagline")}</div>
        )}
      </div>
    </Content>
  );
}

// ── 5. LOGO-PROMINENT ──────────────────────────────────────────────────────────
// Dark radial bg + logo/monogram as hero, offset ghost copy behind it for depth.
function LogoProminent({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, logo, ink } = ctx;
  const gold = lighten(accent, 0.15);
  const mark = logo ? (
    <img src={logo} alt="" style={{ height: "68%", maxHeight: 230, width: "auto", objectFit: "contain" }} />
  ) : (
    // Fallback monogram: first letter of the brand in a ringed circle.
    <Monogram letter={(f("brand")[0] || "P").toUpperCase()} color={gold} fonts={fonts} />
  );
  return (
    <>
      {/* offset ghost mark for depth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translate(6%, 4%)",
          opacity: 0.1,
          filter: logo ? "grayscale(1) brightness(2)" : "none",
        }}
      >
        {logo ? (
          <img src={logo} alt="" style={{ height: "84%", width: "auto", objectFit: "contain" }} />
        ) : (
          <Monogram letter={(f("brand")[0] || "P").toUpperCase()} color={gold} fonts={fonts} big />
        )}
      </div>
      <Content style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center" }}>
          {mark}
          {(has("brand") || has("tagline")) && (
            <div style={{ ...metaStyle(alpha(gold, 0.85), fonts, 13), marginTop: 18, letterSpacing: "0.5em", textAlign: "center" }}>
              {[f("brand"), f("tagline")].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </Content>
    </>
  );
}

function Monogram({ letter, color, fonts, big }: { letter: string; color: string; fonts: TemplateContext["fonts"]; big?: boolean }) {
  const h = big ? "84%" : "68%";
  return (
    <svg viewBox="0 0 200 200" style={{ height: h, maxHeight: big ? undefined : 230, width: "auto" }} fill="none">
      <circle cx="100" cy="100" r="96" stroke={color} strokeWidth="1" />
      <circle cx="100" cy="100" r="72" stroke={color} strokeWidth="0.5" opacity="0.5" />
      <text x="100" y="122" textAnchor="middle" fontFamily={fonts.heading} fontStyle="italic" fontSize="92" fill={color}>
        {letter}
      </text>
    </svg>
  );
}

// ── 6. TYPOGRAPHIC ──────────────────────────────────────────────────────────────
// Oversized 3-line headline, middle word accent heavy-italic, thin top/bottom
// rules, corner meta. Headline is split on line breaks / thirds.
function Typographic({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = ink;
  const raw = f("headline");
  const lines = splitThree(raw);
  return (
    <>
      {/* rules */}
      <div aria-hidden style={{ position: "absolute", left: "4%", right: "4%", top: "9%", height: 1, background: alpha(text, 0.25) }} />
      <div aria-hidden style={{ position: "absolute", left: "4%", right: "4%", bottom: "9%", height: 1, background: alpha(text, 0.25) }} />
      {has("eyebrow") && (
        <div style={{ position: "absolute", left: "4%", top: "10%", ...metaStyle(alpha(text, 0.6), fonts, 13) }}>{f("eyebrow")}</div>
      )}
      {has("website") && (
        <div style={{ position: "absolute", right: "4%", top: "10%", ...metaStyle(alpha(text, 0.6), fonts, 13) }}>{f("website")}</div>
      )}
      <Content style={{ alignItems: "center", padding: "0 4%" }}>
        <div style={{ lineHeight: 0.84 }}>
          {lines.map((ln, i) => (
            <div
              key={i}
              style={{
                fontFamily: fonts.heading,
                fontWeight: i === 1 ? 800 : fonts.headingWeight,
                fontStyle: i === 1 ? "italic" : "normal",
                fontSize: 116,
                letterSpacing: "-0.02em",
                color: i === 1 ? accent : text,
                marginLeft: i === 1 ? "0.4em" : 0,
                marginTop: i === 0 ? 0 : "-0.08em",
              }}
            >
              {ln}
            </div>
          ))}
        </div>
        {(has("brand") || has("tagline")) && (
          <div style={{ marginLeft: "auto", alignSelf: "flex-end", paddingBottom: "6%", textAlign: "right", ...metaStyle(alpha(text, 0.7), fonts, 13) }}>
            {f("brand")}
            {has("tagline") && (
              <>
                <br />
                {f("tagline")}
              </>
            )}
          </div>
        )}
      </Content>
    </>
  );
}

// Split a headline into up to 3 display lines: honor explicit breaks, else chunk
// words into three balanced lines.
function splitThree(text: string): string[] {
  if (!text) return [];
  if (text.includes("\n")) return text.split("\n").slice(0, 3);
  const words = text.split(" ").filter(Boolean);
  if (words.length <= 1) return words;
  if (words.length === 2) return words;
  const per = Math.ceil(words.length / 3);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(" "));
  return out.slice(0, 3);
}

// ── 7. COLOR-BLOCKED ─────────────────────────────────────────────────────────
// Forest/gold diagonal split (a finish) + headline crossing the seam via
// background-clip:text at 50%. Corner meta on each side.
function ColorBlocked({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onInk = paper;
  const onAccent = ink;
  return (
    <>
      <Content style={{ padding: "4%", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {has("eyebrow") && <div style={eyebrowStyle(onInk, fonts, 13)}>{f("eyebrow")}</div>}
          {has("website") && (
            <div style={{ fontFamily: fonts.body, fontSize: 16, color: alpha(onInk, 0.85), paddingBottom: "2%" }}>
              {f("website")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", textAlign: "right" }}>
          {has("tagline") && <div style={eyebrowStyle(onAccent, fonts, 13)}>{f("tagline")}</div>}
          {has("brand") && (
            <div style={{ fontFamily: fonts.heading, fontStyle: "italic", fontSize: 20, color: onAccent, paddingBottom: "2%" }}>
              {f("brand")}
            </div>
          )}
        </div>
      </Content>
      {/* Headline crossing the diagonal. When the "Seam gradient text" finish is
          ON, the headline itself is split 50/50 (paper over the forest half, ink
          over the gold half) so it stays legible across the seam. When OFF, a
          plain paper headline with an accent last word. */}
      {has("headline") && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {ctx.seam ? (
            <h2
              style={{
                fontFamily: fonts.heading,
                fontWeight: 400,
                fontSize: 88,
                lineHeight: 0.95,
                letterSpacing: "-0.025em",
                textAlign: "center",
                margin: 0,
                background: `linear-gradient(to right, ${paper} 0%, ${paper} 50%, ${ink} 50%, ${ink} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {f("headline")}
            </h2>
          ) : (
            <AccentHeadline
              text={f("headline")}
              fonts={fonts}
              color={paper}
              accent={lighten(accent, 0.35)}
              fontSize={88}
              weight={400}
              align="center"
              lineHeight={0.95}
            />
          )}
        </div>
      )}
    </>
  );
}

// ── 8. EDITORIAL ─────────────────────────────────────────────────────────────
// Restrained: centered italic line between two hairline rules, corner meta,
// one accent dot.
function Editorial({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const line = ink;
  return (
    <>
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ height: 1, flex: 1, background: line }} />
        <div style={{ padding: "0 30px" }}>
          <span
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontSize: 46,
              letterSpacing: "-0.01em",
              color: line,
              whiteSpace: "nowrap",
            }}
          >
            {f("headline")}
          </span>
        </div>
        <div style={{ height: 1, flex: 1, background: line }} />
      </div>
      {has("brand") && (
        <div style={{ position: "absolute", left: "4%", top: "12%", ...metaStyle(alpha(line, 0.7), fonts, 13) }}>{f("brand")}</div>
      )}
      {has("tagline") && (
        <div style={{ position: "absolute", right: "4%", top: "12%", ...metaStyle(alpha(line, 0.7), fonts, 13), textAlign: "right" }}>{f("tagline")}</div>
      )}
      {has("eyebrow") && (
        <div style={{ position: "absolute", bottom: "12%", left: "50%", transform: "translateX(-50%)", ...metaStyle(alpha(line, 0.6), fonts, 13), letterSpacing: "0.5em" }}>
          {f("eyebrow")}
        </div>
      )}
      <div aria-hidden style={{ position: "absolute", bottom: "22%", right: "10%", height: 14, width: 14, borderRadius: "50%", background: accent }} />
    </>
  );
}

// ── The registry ──────────────────────────────────────────────────────────────
// Each entry ties the metadata + finish defaults + composition together. baseColor
// and finishConfigs make the SAME finish look right per template.

export const TEMPLATES: Record<TemplateId, TemplateDef & { render: (ctx: TemplateContext) => ReactNode }> = {
  promotion: {
    id: "promotion",
    name: "Promotion",
    purpose: "An offer or deal — the number is the star.",
    fields: ["eyebrow", "headline", "brand", "tagline", "offer", "promoCode"],
    usesLogo: false,
    defaultFinishes: ["ghost-text", "blur-blob"],
    baseColor: (c) => lighten(c.ink, 0.72),
    background: (c) =>
      `radial-gradient(120% 140% at 20% 25%, ${lighten(c.ink, 0.82)} 0%, ${lighten(c.ink, 0.5)} 45%, ${lighten(c.ink, 0.15)} 85%)`,
    palette: (c) => ({ base: lighten(c.ink, 0.72) }),
    finishConfigs: (c) => ({
      "ghost-text": {
        ghostText: c.f("offer") || "$99",
        ghostStroke: true,
        ghostSize: 480,
        ghostAlign: "right",
        ghostX: -4,
        ghostFont: '"Archivo", system-ui, sans-serif',
      },
      "blur-blob": { blobColor: lighten(c.paper, 0.5), blobX: 10, blobY: 15, blobSize: 55, blobAlpha: 0.6 },
    }),
    render: (ctx) => <Promotion ctx={ctx} />,
  },
  cta: {
    id: "cta",
    name: "Call to action",
    purpose: "Drive one action — book, call, sign up.",
    fields: ["brand", "headline", "tagline", "cta", "contact"],
    usesLogo: false,
    defaultFinishes: ["diagonal-split", "ghost-text", "grain"],
    baseColor: (c) => c.ink,
    background: (c) => c.ink,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: (c) => ({
      "diagonal-split": {
        splitFrom: "right",
        splitStart: 66,
        splitEnd: 54,
        splitColor: lighten(c.accent, 0.35),
        splitGradientTo: c.accent,
      },
      "ghost-text": { ghostText: c.f("brand").split(" ")[0] || "care", ghostSize: 300, ghostAlpha: 0.06, ghostX: -1, ghostY: 28, ghostFont: c.fonts.heading },
      grain: { grainAlpha: 0.08 },
    }),
    render: (ctx) => <CallToAction ctx={ctx} />,
  },
  credential: {
    id: "credential",
    name: "Credential",
    purpose: "Lead with a title, license, or years in business.",
    fields: ["eyebrow", "brand", "offer", "tagline"],
    usesLogo: false,
    defaultFinishes: ["blur-blob", "ghost-text", "keyline"],
    baseColor: (c) => c.paper,
    background: (c) => c.paper,
    palette: (c) => ({ base: c.paper }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: lighten(c.ink, 0.35), blobX: -4, blobY: 40, blobSize: 46, blobAlpha: 0.6 },
      "ghost-text": {
        ghostText: c.f("offer") || "FNP-BC",
        ghostSize: 300,
        ghostAlpha: 0.05,
        ghostX: 40,
        ghostY: 50,
        ghostAlign: "left",
        ghostFont: c.fonts.heading,
      },
      keyline: { keyColor: alpha(c.accent, 0.3), keyInset: 3 },
    }),
    render: (ctx) => <Credential ctx={ctx} />,
  },
  "brand-story": {
    id: "brand-story",
    name: "Brand story",
    purpose: "Set a mood — photo-forward with a single line.",
    fields: ["eyebrow", "headline", "brand", "tagline"],
    usesLogo: false,
    defaultFinishes: ["scrim", "blur-blob"],
    baseColor: (c) => c.ink,
    background: (c) =>
      `linear-gradient(115deg, ${c.ink} 0%, ${lighten(c.ink, 0.12)} 35%, ${lighten(c.ink, 0.3)} 65%, ${c.accent} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: (c) => ({
      scrim: { scrimSide: "left", scrimStrength: 0.78 },
      "blur-blob": { blobColor: lighten(c.accent, 0.2), blobX: 88, blobY: 10, blobSize: 60, blobAlpha: 0.5 },
    }),
    render: (ctx) => <BrandStory ctx={ctx} />,
  },
  logo: {
    id: "logo",
    name: "Logo-forward",
    purpose: "Just the mark — clean, centered, confident.",
    fields: ["brand", "tagline"],
    usesLogo: true,
    defaultFinishes: ["blur-blob"],
    baseColor: (c) => darken(c.ink, 0.35),
    background: (c) =>
      `radial-gradient(120% 100% at 30% 40%, ${darken(c.ink, 0.15)} 0%, ${darken(c.ink, 0.45)} 70%, ${darken(c.ink, 0.65)} 100%)`,
    palette: (c) => ({ base: darken(c.ink, 0.35) }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: c.accent, blobX: 30, blobY: 40, blobSize: 65, blobAlpha: 0.25 },
    }),
    render: (ctx) => <LogoProminent ctx={ctx} />,
  },
  typographic: {
    id: "typographic",
    name: "Typographic",
    purpose: "A bold statement — big type does the work.",
    fields: ["eyebrow", "headline", "website", "brand", "tagline"],
    usesLogo: false,
    defaultFinishes: [],
    baseColor: (c) => lighten(c.paper, 0.2),
    background: (c) => lighten(c.paper, 0.2),
    palette: (c) => ({ base: lighten(c.paper, 0.2) }),
    finishConfigs: () => ({}),
    render: (ctx) => <Typographic ctx={ctx} />,
  },
  "color-blocked": {
    id: "color-blocked",
    name: "Color-blocked",
    purpose: "Two brand colors, split on a diagonal.",
    fields: ["eyebrow", "headline", "brand", "tagline", "website"],
    usesLogo: false,
    defaultFinishes: ["diagonal-split", "seam-gradient"],
    // Color-blocked's headline is the ONLY one built to read the seam gradient,
    // so it's the only template that offers it.
    applicableFinishes: ["diagonal-split", "seam-gradient", "grain", "keyline", "ghost-text"],
    baseColor: (c) => c.ink,
    background: (c) => c.ink,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: (c) => ({
      "diagonal-split": { splitFrom: "right", splitStart: 58, splitEnd: 42, splitColor: c.accent },
    }),
    render: (ctx) => <ColorBlocked ctx={ctx} />,
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    purpose: "Quiet and refined — one line, framed.",
    fields: ["headline", "brand", "tagline", "eyebrow"],
    usesLogo: false,
    defaultFinishes: [],
    baseColor: (c) => lighten(c.paper, 0.25),
    background: (c) => lighten(c.paper, 0.25),
    palette: (c) => ({ base: lighten(c.paper, 0.25) }),
    finishConfigs: () => ({}),
    render: (ctx) => <Editorial ctx={ctx} />,
  },
};

export const TEMPLATE_LIST: TemplateId[] = [
  "promotion",
  "cta",
  "credential",
  "brand-story",
  "logo",
  "typographic",
  "color-blocked",
  "editorial",
];

export function getTemplate(id: TemplateId) {
  return TEMPLATES[id] ?? TEMPLATES["color-blocked"];
}

// Every finish EXCEPT seam-gradient works as a background/overlay layer on any
// template (ghost-text self-defaults to the brand word). Seam-gradient is a
// headline treatment that only Color-blocked renders, so it's opt-in per template.
const UNIVERSAL_FINISHES: FinishKind[] = [
  "diagonal-split",
  "scrim",
  "ghost-text",
  "grain",
  "blur-blob",
  "keyline",
];

/** The finishes the editor should OFFER for a template — only ones that do
 *  something, so there are never dead toggles. */
export function applicableFinishesFor(id: TemplateId): FinishKind[] {
  return getTemplate(id).applicableFinishes ?? UNIVERSAL_FINISHES;
}

/** The base color the banner sits on, for a given state (feeds finish light/dark). */
export function baseColorFor(state: BannerState): string {
  return getTemplate(activeTemplateId(state)).baseColor(buildContext(state));
}

/** The base background layer for a state's active template. */
export function backgroundFor(state: BannerState): CSSProperties["background"] {
  return getTemplate(activeTemplateId(state)).background(buildContext(state));
}

/** The full FinishPalette for a state's active template. */
export function finishPaletteFor(state: BannerState): FinishPalette {
  const ctx = buildContext(state);
  const tpl = getTemplate(activeTemplateId(state));
  const over = tpl.palette?.(ctx) ?? {};
  return {
    accent: ctx.accent,
    ink: ctx.ink,
    paper: ctx.paper,
    base: over.base ?? tpl.baseColor(ctx),
    // First word of the brand (or headline) — the ghost-word fallback so the
    // "Ghost word" finish always renders on any template.
    brandWord: (ctx.f("brand") || ctx.f("headline")).split(" ")[0] || undefined,
    ...over,
  };
}

/** The per-finish config map for a state's active template. */
export function finishConfigsFor(state: BannerState): Partial<Record<FinishKind, FinishConfig>> {
  const ctx = buildContext(state);
  return getTemplate(activeTemplateId(state)).finishConfigs(ctx);
}

// re-export for the canvas
export { buildContext };
export { readableOn, isLight };

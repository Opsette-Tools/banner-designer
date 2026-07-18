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
  const accentSpan: CSSProperties = {
    color: accent,
    fontStyle: italicAccent ? "italic" : "normal",
    fontWeight: italicAccent ? 400 : (weight ?? fonts.headingWeight),
  };

  // Explicit accent marker: wrap the pivot word(s) in *asterisks* to accent them
  // ANYWHERE in the line (e.g. "a season *of* health and rest"), not just the
  // last word. If no marker is present, fall back to accenting the last word.
  if (text.includes("*")) {
    const parts = text.split(/\*([^*]+)\*/); // [before, accented, after, accented, ...]
    return (
      <h2 style={{ ...base, color }}>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} style={accentSpan}>
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
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
      <span style={accentSpan}>{last}</span>
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

// ═══════════════════════════════════════════════════════════════════════════
//  PHOTO TEMPLATES (added 2026-07-18)
//  Each reads ctx.photoZone to keep copy off the carved panel; the photo itself
//  is painted by BannerCanvas (panel or full-bleed), NOT by these compositions.
// ═══════════════════════════════════════════════════════════════════════════

// A padded content box that lives INSIDE the clear text zone of a photo panel.
// When there's no panel (photoZone = 0..100) it's just full-width padded content.
function ZoneContent({
  zone,
  children,
  style,
}: {
  zone: { x0: number; x1: number };
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${zone.x0}%`,
        right: `${100 - zone.x1}%`,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── 9. TEAM INTRO (photo panel) ────────────────────────────────────────────────
// Photo carved on one side; name, role (eyebrow) and a line on the clear side.
// The "meet the team" / "about us" staple.
function TeamIntro({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper, photoZone, hasPanel } = ctx;
  const onPaper = darken(ink, 0.15);
  // If the panel is on the left, text is on the right — nudge padding accordingly.
  const padSide = ctx.photo.side === "left" || !hasPanel ? "3%" : "0";
  return (
    <ZoneContent
      zone={photoZone}
      style={{ justifyContent: "center", paddingLeft: hasPanel && ctx.photo.side === "left" ? "3%" : padSide, paddingRight: "4%", gap: 14 }}
    >
      {has("eyebrow") && <div style={eyebrowStyle(darken(accent, 0.2), fonts, 14)}>{f("eyebrow")}</div>}
      {has("brand") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontWeight: fonts.headingWeight,
            fontSize: 68,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: onPaper,
            margin: 0,
          }}
        >
          {f("brand")}
        </h2>
      )}
      {has("tagline") && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 4 }}>
          <div style={{ height: 2, width: 54, background: accent, flexShrink: 0 }} />
          <div style={{ fontFamily: fonts.body, fontSize: 20, lineHeight: 1.35, color: alpha(onPaper, 0.82), maxWidth: 520 }}>
            {f("tagline")}
          </div>
        </div>
      )}
      {has("contact") && (
        <div style={{ ...metaStyle(alpha(onPaper, 0.6), fonts, 13), marginTop: 10 }}>{f("contact")}</div>
      )}
    </ZoneContent>
  );
}

// ── 10. PRODUCT HERO (photo panel) ──────────────────────────────────────────────
// Product photo on one side (curve seam by default), the offer/price as a big
// number and a CTA pill on the clear side. Selling a thing.
function ProductHero({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper, photoZone } = ctx;
  const onPaper = darken(ink, 0.15);
  return (
    <ZoneContent zone={photoZone} style={{ justifyContent: "center", padding: "0 4%", gap: 12 }}>
      {has("eyebrow") && <div style={eyebrowStyle(darken(accent, 0.2), fonts, 13)}>{f("eyebrow")}</div>}
      {has("headline") && (
        <AccentHeadline
          text={f("headline")}
          fonts={fonts}
          color={onPaper}
          accent={darken(accent, 0.1)}
          fontSize={54}
          weight={fonts.headingWeight}
          lineHeight={1.0}
          maxWidth="100%"
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 8, flexWrap: "wrap" }}>
        {has("offer") && (
          <div style={{ fontFamily: fonts.heading, fontStyle: "italic", fontSize: 76, lineHeight: 0.9, color: accent }}>
            {f("offer")}
          </div>
        )}
        {has("cta") && (
          <div
            role="presentation"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 999,
              background: darken(ink, 0.05),
              color: paper,
              padding: "16px 26px",
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 18,
              boxShadow: `0 14px 30px -12px ${alpha(ink, 0.6)}`,
            }}
          >
            {f("cta")}
            <span aria-hidden style={{ color: lighten(accent, 0.25) }}>→</span>
          </div>
        )}
      </div>
      {has("brand") && (
        <div style={{ ...metaStyle(alpha(onPaper, 0.6), fonts, 13), marginTop: 10 }}>{f("brand")}</div>
      )}
    </ZoneContent>
  );
}

// ── 11. QUOTE / TESTIMONIAL (full-bleed photo) ──────────────────────────────────
// Full-bleed photo + scrim, a big italic pull-quote, attribution beneath. Social
// proof with a face behind it.
function QuoteBanner({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent } = ctx;
  const onDark = "#ffffff";
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 6%" }}>
      <div aria-hidden style={{ fontFamily: fonts.heading, fontStyle: "italic", fontSize: 120, lineHeight: 0.5, color: alpha(accent, 0.9), height: 40 }}>
        “
      </div>
      {has("quote") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 52,
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            color: onDark,
            margin: 0,
            maxWidth: "78%",
          }}
        >
          {f("quote")}
        </h2>
      )}
      {has("attribution") && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
          <div style={{ height: 2, width: 44, background: accent }} />
          <div style={metaStyle(alpha(onDark, 0.85), fonts, 14)}>{f("attribution")}</div>
        </div>
      )}
    </Content>
  );
}

// ── 12. EVENT / ANNOUNCEMENT (full-bleed photo) ─────────────────────────────────
// Full-bleed photo, bottom scrim, "you're invited" eyebrow, headline + a date/
// place detail line, contact bottom-right.
function EventBanner({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent } = ctx;
  const onDark = "#ffffff";
  return (
    <Content style={{ flexDirection: "column", justifyContent: "flex-end", padding: "4%" }}>
      {has("eyebrow") && (
        <div style={{ ...eyebrowStyle(lighten(accent, 0.2), fonts, 14), marginBottom: 14 }}>{f("eyebrow")}</div>
      )}
      {has("headline") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontWeight: fonts.headingWeight,
            fontSize: 70,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: onDark,
            margin: 0,
            maxWidth: "80%",
          }}
        >
          {f("headline")}
        </h2>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginTop: 20 }}>
        {has("detail") && (
          <div style={{ fontFamily: fonts.body, fontSize: 22, fontWeight: 600, color: onDark }}>{f("detail")}</div>
        )}
        {has("contact") && (
          <div style={{ ...metaStyle(alpha(onDark, 0.8), fonts, 13), textAlign: "right" }}>{f("contact")}</div>
        )}
      </div>
    </Content>
  );
}

// ── 13. SPLIT FEATURE (photo panel + solid block) ───────────────────────────────
// Photo on one side, a SOLID accent/ink block fills the text side (reversed
// text), so it reads more designed than a plain intro. The block is drawn here
// (behind the text) filling exactly the photoZone.
function SplitFeature({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper, photoZone, hasPanel } = ctx;
  const block = ink;
  const onBlock = paper;
  return (
    <>
      {/* Solid block filling the clear side (only when a panel is actually present). */}
      {hasPanel && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${photoZone.x0 - 3}%`,
            right: `${100 - photoZone.x1}%`,
            background: block,
          }}
        />
      )}
      <ZoneContent zone={photoZone} style={{ justifyContent: "center", padding: "0 4%", gap: 14 }}>
        {has("eyebrow") && <div style={eyebrowStyle(lighten(accent, 0.15), fonts, 13)}>{f("eyebrow")}</div>}
        {has("headline") && (
          <AccentHeadline
            text={f("headline")}
            fonts={fonts}
            color={onBlock}
            accent={lighten(accent, 0.3)}
            fontSize={56}
            weight={fonts.headingWeight}
            lineHeight={1.0}
            maxWidth="100%"
          />
        )}
        {has("tagline") && (
          <div style={{ fontFamily: fonts.body, fontSize: 19, lineHeight: 1.4, color: alpha(onBlock, 0.8), marginTop: 4, maxWidth: 520 }}>
            {f("tagline")}
          </div>
        )}
        {has("brand") && (
          <div style={{ ...metaStyle(alpha(onBlock, 0.65), fonts, 13), marginTop: 10 }}>{f("brand")}</div>
        )}
      </ZoneContent>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  NON-PHOTO TEMPLATES (added 2026-07-18)
// ═══════════════════════════════════════════════════════════════════════════

// ── 14. ANNOUNCEMENT ────────────────────────────────────────────────────────────
// A bold badge word ("NOW OPEN") as the hero with a supporting line + detail.
function Announcement({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = ink;
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 6%" }}>
      {has("eyebrow") && (
        <div
          style={{
            display: "inline-block",
            background: accent,
            color: readableOn(accent),
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            padding: "8px 18px",
            borderRadius: 4,
            marginBottom: 22,
          }}
        >
          {f("eyebrow")}
        </div>
      )}
      {has("headline") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: text,
            margin: 0,
            maxWidth: "88%",
          }}
        >
          {f("headline")}
        </h2>
      )}
      {(has("tagline") || has("detail")) && (
        <div style={{ display: "flex", gap: 28, marginTop: 22, flexWrap: "wrap" }}>
          {has("tagline") && <div style={{ fontFamily: fonts.body, fontSize: 20, color: alpha(text, 0.8) }}>{f("tagline")}</div>}
          {has("detail") && <div style={{ fontFamily: fonts.body, fontSize: 20, fontWeight: 600, color: darken(accent, 0.15) }}>{f("detail")}</div>}
        </div>
      )}
    </Content>
  );
}

// ── 15. TESTIMONIAL (text-only) ──────────────────────────────────────────────────
// Giant quotation mark ghost, an italic quote, attribution. No photo needed.
function Testimonial({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const text = darken(ink, 0.1);
  return (
    <>
      <div aria-hidden style={{ position: "absolute", left: "4%", top: "2%", fontFamily: fonts.heading, fontStyle: "italic", fontWeight: 800, fontSize: 380, lineHeight: 1, color: alpha(accent, 0.14), userSelect: "none" }}>
        “
      </div>
      <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 8%" }}>
        {has("quote") && (
          <h2
            style={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 50,
              lineHeight: 1.14,
              letterSpacing: "-0.01em",
              color: text,
              margin: 0,
              maxWidth: "82%",
            }}
          >
            {f("quote")}
          </h2>
        )}
        {has("attribution") && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26 }}>
            <div style={{ height: 2, width: 48, background: accent }} />
            <div style={metaStyle(alpha(text, 0.75), fonts, 14)}>{f("attribution")}</div>
          </div>
        )}
      </Content>
    </>
  );
}

// ── 16. MENU / PRICE LIST ─────────────────────────────────────────────────────
// A heading + up to 3 "item ..... price" rows with dotted leaders. Items are
// parsed from the tagline: "Item | $Price" per line (or "Item - $Price").
function MenuList({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = darken(ink, 0.1);
  const rows = parseMenu(f("tagline"));
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 7%", gap: 8 }}>
      {has("eyebrow") && <div style={{ ...eyebrowStyle(darken(accent, 0.2), fonts, 14), marginBottom: 6 }}>{f("eyebrow")}</div>}
      {has("brand") && (
        <h2 style={{ fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", color: text, margin: "0 0 14px" }}>
          {f("brand")}
        </h2>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, fontFamily: fonts.body }}>
          <span style={{ fontSize: 26, fontWeight: 500, color: text, whiteSpace: "nowrap" }}>{r.name}</span>
          <span style={{ flex: 1, borderBottom: `2px dotted ${alpha(text, 0.3)}`, transform: "translateY(-6px)" }} />
          <span style={{ fontSize: 26, fontWeight: 700, color: darken(accent, 0.15), whiteSpace: "nowrap" }}>{r.price}</span>
        </div>
      ))}
      {has("website") && (
        <div style={{ ...metaStyle(alpha(text, 0.6), fonts, 13), marginTop: 16 }}>{f("website")}</div>
      )}
    </Content>
  );
}

// Parse "Name | $Price" or "Name - $Price" lines (up to 3) from a textarea value.
function parseMenu(raw: string): { name: string; price: string }[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((ln) => ln.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((ln) => {
      const m = ln.split(/\s*[|]\s*|\s+[-–]\s+/);
      if (m.length >= 2) return { name: m[0], price: m[m.length - 1] };
      return { name: ln, price: "" };
    });
}

// ── 17. COUNTDOWN / URGENCY ────────────────────────────────────────────────────
// "2 DAYS LEFT" style urgency hero (from offer), the deal (headline), code.
function Countdown({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onDark = paper;
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 5%", textAlign: "center", gap: 10 }}>
      {has("offer") && (
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: 104,
            lineHeight: 0.86,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: lighten(accent, 0.25),
          }}
        >
          {f("offer")}
        </div>
      )}
      {has("headline") && (
        <div style={{ fontFamily: fonts.body, fontSize: 26, fontWeight: 600, color: onDark, maxWidth: "80%" }}>
          {f("headline")}
        </div>
      )}
      {has("promoCode") && (
        <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, border: `2px dashed ${alpha(onDark, 0.5)}`, borderRadius: 8, padding: "10px 22px" }}>
          <span style={{ ...metaStyle(alpha(onDark, 0.7), fonts, 12) }}>Code</span>
          <span style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 22, letterSpacing: "0.16em", color: onDark }}>{f("promoCode")}</span>
        </div>
      )}
    </Content>
  );
}

// ── 18. WORDMARK (minimal) ──────────────────────────────────────────────────────
// Brand name centered between two thin rules with a tagline. A cleaner, logo-free
// sibling to Logo-forward.
function Wordmark({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const text = ink;
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 8%", textAlign: "center" }}>
      <div aria-hidden style={{ width: 90, height: 1, background: alpha(text, 0.4), marginBottom: 26 }} />
      {has("brand") && (
        <h2 style={{ fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: 74, lineHeight: 1, letterSpacing: "-0.01em", color: text, margin: 0 }}>
          {f("brand")}
        </h2>
      )}
      {has("tagline") && (
        <div style={{ ...metaStyle(alpha(text, 0.7), fonts, 14), marginTop: 18, letterSpacing: "0.42em" }}>{f("tagline")}</div>
      )}
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
        <div style={{ width: 40, height: 1, background: alpha(text, 0.4) }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
        <div style={{ width: 40, height: 1, background: alpha(text, 0.4) }} />
      </div>
    </Content>
  );
}

// ── 19. STAT / PROOF ────────────────────────────────────────────────────────────
// One big number ("500+", "15 years") as the hero with a label + supporting line.
function Stat({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const text = darken(ink, 0.1);
  return (
    <Content style={{ alignItems: "center", padding: "0 6%", gap: "4%" }}>
      {has("offer") && (
        <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 172, lineHeight: 0.82, letterSpacing: "-0.04em", color: accent, flexShrink: 0 }}>
          {f("offer")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {has("headline") && (
          <div style={{ fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: 46, lineHeight: 1.02, letterSpacing: "-0.02em", color: text, maxWidth: 620 }}>
            {f("headline")}
          </div>
        )}
        {has("tagline") && (
          <div style={{ fontFamily: fonts.body, fontSize: 19, lineHeight: 1.4, color: alpha(text, 0.75), maxWidth: 560 }}>{f("tagline")}</div>
        )}
        {has("brand") && (
          <div style={{ ...metaStyle(alpha(text, 0.6), fonts, 13), marginTop: 6 }}>{f("brand")}</div>
        )}
      </div>
    </Content>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  WAVE 2 TEMPLATES (added 2026-07-18)
//  From Lovable provider-kit mockups Ruthnie liked. Data-driven, hand-built —
//  no Lovable round-trip. Common threads: rounded photo crops, italic-accent
//  last word, big ghost numerals/marks, gold-on-deep meta.
// ═══════════════════════════════════════════════════════════════════════════

// A small gold star row (five filled stars) — used by the bold testimonial.
function StarRow({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <div aria-hidden style={{ display: "flex", gap: size * 0.24 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17.8 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ── 20. PROVIDER PROFILE (photo panel, rounded inset) ───────────────────────────
// Rounded-rectangle photo floated on a deep gradient panel; eyebrow, a big serif
// name with an italic-accent credential (Offer), two meta lines + an accent rule.
function ProviderProfile({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper, photoZone } = ctx;
  const onDark = paper;
  const gold = lighten(accent, 0.2);
  const cred = f("offer"); // the credential ("FNP-BC") rides in Offer
  const padLeft = ctx.photo.side === "left" ? "4%" : "5%";
  return (
    <ZoneContent zone={photoZone} style={{ justifyContent: "center", paddingLeft: padLeft, paddingRight: "5%", gap: 14 }}>
      {has("eyebrow") && <div style={eyebrowStyle(gold, fonts, 14)}>{f("eyebrow")}</div>}
      {has("brand") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontWeight: fonts.headingWeight,
            fontSize: 66,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: onDark,
            margin: 0,
          }}
        >
          {f("brand")}
          {cred && (
            <span style={{ fontStyle: "italic", fontWeight: 400, color: gold }}>, {cred}</span>
          )}
        </h2>
      )}
      {has("tagline") && (
        <div style={{ fontFamily: fonts.body, fontSize: 20, lineHeight: 1.4, color: alpha(onDark, 0.82), maxWidth: 520, marginTop: 2 }}>
          {f("tagline")}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
        <div style={{ height: 2, width: 54, background: accent, flexShrink: 0 }} />
        {has("contact") && <div style={metaStyle(alpha(onDark, 0.7), fonts, 13)}>{f("contact")}</div>}
      </div>
    </ZoneContent>
  );
}

// ── 21. TESTIMONIAL (bold) ──────────────────────────────────────────────────────
// A giant faint quote-mark top-left, a very large multi-line serif quote hero, a
// 5-gold-star row + small attribution bottom-left, brand bottom-right, pale card.
function TestimonialBold({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const text = darken(ink, 0.1);
  const gold = darken(accent, 0.08);
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "3%",
          top: "-6%",
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: 460,
          lineHeight: 1,
          color: alpha(accent, 0.16),
          userSelect: "none",
        }}
      >
        “
      </div>
      <Content style={{ flexDirection: "column", justifyContent: "center", padding: "6% 7%" }}>
        {has("quote") && (
          <h2
            style={{
              fontFamily: fonts.heading,
              fontWeight: 400,
              fontSize: 62,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: text,
              margin: 0,
              maxWidth: "86%",
            }}
          >
            {f("quote")}
          </h2>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginTop: 34 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StarRow color={gold} size={30} />
            {has("attribution") && <div style={metaStyle(alpha(text, 0.7), fonts, 14)}>{f("attribution")}</div>}
          </div>
          {has("brand") && (
            <div style={{ fontFamily: fonts.heading, fontStyle: "italic", fontSize: 26, color: alpha(text, 0.8), whiteSpace: "nowrap" }}>
              {f("brand")}
            </div>
          )}
        </div>
      </Content>
    </>
  );
}

// ── 22. HOW IT WORKS / STEPS (2–4) ───────────────────────────────────────────────
// Deep panel with big faint numerals across a connecting hairline, each with a
// bold step title + a line of copy. Driven by the structured `steps` list (a real
// add/remove editor in the sidebar), so the layout adapts to 2, 3, or 4 columns.
function HowItWorks({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onDark = paper;
  const gold = lighten(accent, 0.2);
  const steps = ctx.steps.slice(0, 4);
  const n = Math.max(1, steps.length);
  // Step type down a notch when the row gets crowded (4 columns) so it stays
  // readable at every column count.
  const numSize = n >= 4 ? 78 : 96;
  const titleSize = n >= 4 ? 26 : 30;
  const bodySize = n >= 4 ? 15 : 17;
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 6%", gap: 34 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {has("eyebrow") && <div style={eyebrowStyle(gold, fonts, 14)}>{f("eyebrow")}</div>}
        {has("brand") && (
          <h2 style={{ fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: 46, lineHeight: 1, letterSpacing: "-0.02em", color: onDark, margin: 0 }}>
            {f("brand")}
          </h2>
        )}
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: "4%", alignItems: "start" }}>
        {/* connecting hairline behind the numerals — only spans between steps, so a
            2-step row doesn't trail a lonely line off the right edge. */}
        {n > 1 && (
          <div aria-hidden style={{ position: "absolute", left: `${100 / n / 2}%`, right: `${100 / n / 2}%`, top: numSize * 0.42, height: 1, background: alpha(onDark, 0.25) }} />
        )}
        {steps.map((s, i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: numSize, lineHeight: 0.8, color: alpha(gold, 0.55) }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: titleSize, lineHeight: 1.05, color: onDark, marginTop: 4 }}>
              {s.title}
            </div>
            {s.body && (
              <div style={{ fontFamily: fonts.body, fontSize: bodySize, lineHeight: 1.4, color: alpha(onDark, 0.75) }}>{s.body}</div>
            )}
          </div>
        ))}
      </div>
    </Content>
  );
}

// ── 23. LOCAL PRIDE ─────────────────────────────────────────────────────────────
// A big map-pin glyph watermark on one side, brand eyebrow, and a huge serif
// lead-in ("Proudly caring for") with the LOCATION as the italic-accent place —
// the location is its own field, so the "local" premise is real and store-able.
function LocalPride({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const text = ink;
  const lead = f("headline"); // "Proudly caring for"
  const place = f("location"); // "Portland"
  return (
    <>
      {/* map-pin watermark, right side */}
      <div aria-hidden style={{ position: "absolute", right: "-2%", top: "50%", transform: "translateY(-50%)", opacity: 0.1 }}>
        <svg width="360" height="360" viewBox="0 0 24 24" fill={accent}>
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
      </div>
      <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 6%", gap: 20 }}>
        {has("brand") && <div style={eyebrowStyle(darken(accent, 0.2), fonts, 14)}>{f("brand")}</div>}
        {(lead || place) && (
          <h2
            style={{
              fontFamily: fonts.heading,
              fontWeight: fonts.headingWeight,
              fontSize: 82,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              color: text,
              margin: 0,
              maxWidth: "78%",
            }}
          >
            {lead}
            {lead && place ? " " : ""}
            {place && (
              <span style={{ color: accent, fontStyle: "italic", fontWeight: 400 }}>
                {place}
                {/* a period reads as a finished statement, like the reference */}
                {/\.$/.test(place) ? "" : "."}
              </span>
            )}
          </h2>
        )}
      </Content>
    </>
  );
}

// ── 24. SEASONAL GREETING ────────────────────────────────────────────────────────
// Pale card, centered big serif italic-accent greeting, a small centered
// "FROM ALL OF US AT ..." (brand) line beneath. A holiday/seasonal slot.
function Seasonal({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink } = ctx;
  const text = darken(ink, 0.05);
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 9%", textAlign: "center", gap: 26 }}>
      <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 1, background: alpha(text, 0.4) }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
        <div style={{ width: 40, height: 1, background: alpha(text, 0.4) }} />
      </div>
      {has("headline") && (
        <h2
          style={{
            fontFamily: fonts.heading,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 56,
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            textAlign: "center",
            color: text,
            margin: 0,
          }}
        >
          {f("headline")}
        </h2>
      )}
      {has("brand") && (
        <div style={{ ...metaStyle(alpha(text, 0.6), fonts, 13), letterSpacing: "0.36em" }}>{f("brand")}</div>
      )}
    </Content>
  );
}

// ── 25. DID YOU KNOW (education) ──────────────────────────────────────────────────
// Deep panel, small gold "DID YOU KNOW?" eyebrow, a large serif hero with an
// italic accent word, one supporting line, brand bottom-right.
function DidYouKnow({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onDark = paper;
  const gold = lighten(accent, 0.2);
  return (
    <Content style={{ flexDirection: "column", justifyContent: "center", padding: "5% 6%", gap: 20 }}>
      {has("eyebrow") && <div style={eyebrowStyle(gold, fonts, 14)}>{f("eyebrow")}</div>}
      {has("headline") && (
        <AccentHeadline
          text={f("headline")}
          fonts={fonts}
          color={onDark}
          accent={gold}
          fontSize={58}
          weight={400}
          italicAccent
          lineHeight={1.08}
          maxWidth="82%"
        />
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginTop: 6 }}>
        {has("tagline") && (
          <div style={{ fontFamily: fonts.body, fontSize: 20, lineHeight: 1.4, color: alpha(onDark, 0.78), maxWidth: "66%" }}>
            {f("tagline")}
          </div>
        )}
        {has("brand") && (
          <div style={{ ...metaStyle(alpha(onDark, 0.7), fonts, 13), textAlign: "right", whiteSpace: "nowrap" }}>{f("brand")}</div>
        )}
      </div>
    </Content>
  );
}

// ── 26. MILESTONE / ANNIVERSARY ───────────────────────────────────────────────────
// Deep panel with a GIANT ghost numeral (the Offer, e.g. "5") bleeding off the
// right, eyebrow "ANNIVERSARY", a serif hero with an italic accent + a thank-you
// line. The number treatment is drawn here (not the ghost-text finish) so it
// bleeds off-edge exactly.
function Milestone({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent, ink, paper } = ctx;
  const onDark = paper;
  const gold = lighten(accent, 0.2);
  return (
    <>
      {has("offer") && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: "-4%",
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: 560,
            lineHeight: 0.8,
            letterSpacing: "-0.04em",
            color: alpha(gold, 0.14),
            userSelect: "none",
          }}
        >
          {f("offer")}
        </div>
      )}
      <Content style={{ flexDirection: "column", justifyContent: "center", padding: "0 6%", gap: 18 }}>
        {has("eyebrow") && <div style={eyebrowStyle(gold, fonts, 14)}>{f("eyebrow")}</div>}
        {has("headline") && (
          <AccentHeadline
            text={f("headline")}
            fonts={fonts}
            color={onDark}
            accent={gold}
            fontSize={68}
            weight={fonts.headingWeight}
            italicAccent
            lineHeight={1.0}
            maxWidth="72%"
          />
        )}
        {has("tagline") && (
          <div style={{ fontFamily: fonts.body, fontSize: 20, lineHeight: 1.4, color: alpha(onDark, 0.78), maxWidth: "64%" }}>
            {f("tagline")}
          </div>
        )}
      </Content>
    </>
  );
}

// ── 27. BEHIND THE SCENES (full-bleed photo) ──────────────────────────────────────
// A real interior/office photo full-bleed with a left scrim, an eyebrow, a big
// serif stacked hero (line-broken, italic accent last line), brand meta bottom.
function BehindTheScenes({ ctx }: { ctx: TemplateContext }) {
  const { f, has, fonts, accent } = ctx;
  const onDark = "#ffffff";
  const gold = lighten(accent, 0.25);
  const lines = splitThree(f("headline"));
  return (
    <Content style={{ flexDirection: "column", justifyContent: "flex-end", padding: "4%" }}>
      {has("eyebrow") && (
        <div style={{ ...eyebrowStyle(gold, fonts, 14), marginBottom: 16 }}>{f("eyebrow")}</div>
      )}
      {has("headline") && (
        <div style={{ lineHeight: 1.0 }}>
          {lines.map((ln, i) => (
            <div
              key={i}
              style={{
                fontFamily: fonts.heading,
                fontWeight: i === lines.length - 1 ? 400 : fonts.headingWeight,
                fontStyle: i === lines.length - 1 ? "italic" : "normal",
                fontSize: 66,
                letterSpacing: "-0.02em",
                color: i === lines.length - 1 ? gold : onDark,
              }}
            >
              {ln}
            </div>
          ))}
        </div>
      )}
      {has("brand") && (
        <div style={{ ...metaStyle(alpha(onDark, 0.8), fonts, 13), marginTop: 18 }}>{f("brand")}</div>
      )}
    </Content>
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
    photoMode: "fullbleed",
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

  // ── PHOTO TEMPLATES ──────────────────────────────────────────────────────
  "team-intro": {
    id: "team-intro",
    name: "Team intro",
    purpose: "Put a face to the name — photo on one side, intro on the other.",
    fields: ["eyebrow", "brand", "tagline", "contact"],
    usesLogo: false,
    photoMode: "panel",
    defaultFinishes: ["blur-blob"],
    applicableFinishes: ["blur-blob", "grain", "keyline"],
    baseColor: (c) => lighten(c.paper, 0.2),
    background: (c) => lighten(c.paper, 0.2),
    palette: (c) => ({ base: lighten(c.paper, 0.2) }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: lighten(c.accent, 0.2), blobX: 80, blobY: 80, blobSize: 44, blobAlpha: 0.35 },
    }),
    render: (ctx) => <TeamIntro ctx={ctx} />,
  },
  "product-hero": {
    id: "product-hero",
    name: "Product hero",
    purpose: "Show the product, name the price, drive the click.",
    fields: ["eyebrow", "headline", "offer", "cta", "brand"],
    usesLogo: false,
    photoMode: "panel",
    defaultFinishes: [],
    applicableFinishes: ["blur-blob", "grain", "keyline"],
    baseColor: (c) => lighten(c.paper, 0.25),
    background: (c) => lighten(c.paper, 0.25),
    palette: (c) => ({ base: lighten(c.paper, 0.25) }),
    finishConfigs: () => ({}),
    render: (ctx) => <ProductHero ctx={ctx} />,
  },
  quote: {
    id: "quote",
    name: "Quote",
    purpose: "A testimonial with a face behind it — social proof.",
    fields: ["quote", "attribution"],
    usesLogo: false,
    photoMode: "fullbleed",
    defaultFinishes: ["scrim", "grain"],
    applicableFinishes: ["scrim", "grain", "blur-blob"],
    baseColor: (c) => c.ink,
    background: (c) => c.ink,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({
      scrim: { scrimSide: "full", scrimStrength: 0.6 },
      grain: { grainAlpha: 0.1 },
    }),
    render: (ctx) => <QuoteBanner ctx={ctx} />,
  },
  event: {
    id: "event",
    name: "Event",
    purpose: "Announce a date — photo, headline, when and where.",
    fields: ["eyebrow", "headline", "detail", "contact"],
    usesLogo: false,
    photoMode: "fullbleed",
    defaultFinishes: ["scrim"],
    applicableFinishes: ["scrim", "grain", "blur-blob"],
    baseColor: (c) => c.ink,
    background: (c) => c.ink,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({
      scrim: { scrimSide: "bottom", scrimStrength: 0.85 },
    }),
    render: (ctx) => <EventBanner ctx={ctx} />,
  },
  "split-feature": {
    id: "split-feature",
    name: "Split feature",
    purpose: "Photo meets a solid color block — bold and designed.",
    fields: ["eyebrow", "headline", "tagline", "brand"],
    usesLogo: false,
    photoMode: "panel",
    defaultFinishes: [],
    applicableFinishes: ["grain", "keyline"],
    baseColor: (c) => c.paper,
    background: (c) => c.paper,
    palette: (c) => ({ base: c.paper }),
    finishConfigs: () => ({}),
    render: (ctx) => <SplitFeature ctx={ctx} />,
  },

  // ── NON-PHOTO TEMPLATES ──────────────────────────────────────────────────
  announcement: {
    id: "announcement",
    name: "Announcement",
    purpose: "Big news — NOW OPEN, we moved, we're hiring.",
    fields: ["eyebrow", "headline", "tagline", "detail"],
    usesLogo: false,
    defaultFinishes: ["blur-blob"],
    baseColor: (c) => lighten(c.paper, 0.2),
    background: (c) =>
      `radial-gradient(120% 130% at 85% 20%, ${lighten(c.accent, 0.55)} 0%, ${lighten(c.paper, 0.2)} 55%)`,
    palette: (c) => ({ base: lighten(c.paper, 0.2) }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: lighten(c.accent, 0.25), blobX: 88, blobY: 30, blobSize: 50, blobAlpha: 0.4 },
    }),
    render: (ctx) => <Announcement ctx={ctx} />,
  },
  testimonial: {
    id: "testimonial",
    name: "Testimonial",
    purpose: "A customer quote, text-only — no photo needed.",
    fields: ["quote", "attribution"],
    usesLogo: false,
    defaultFinishes: ["keyline"],
    baseColor: (c) => lighten(c.paper, 0.25),
    background: (c) => lighten(c.paper, 0.25),
    palette: (c) => ({ base: lighten(c.paper, 0.25) }),
    finishConfigs: (c) => ({ keyline: { keyColor: alpha(c.accent, 0.3), keyInset: 3 } }),
    render: (ctx) => <Testimonial ctx={ctx} />,
  },
  menu: {
    id: "menu",
    name: "Menu / prices",
    purpose: "A short price list — services and what they cost.",
    fields: ["eyebrow", "brand", "tagline", "website"],
    usesLogo: false,
    defaultFinishes: [],
    baseColor: (c) => c.paper,
    background: (c) => c.paper,
    palette: (c) => ({ base: c.paper }),
    finishConfigs: () => ({}),
    render: (ctx) => <MenuList ctx={ctx} />,
  },
  countdown: {
    id: "countdown",
    name: "Countdown",
    purpose: "Urgency — days left, the deal, the code.",
    fields: ["offer", "headline", "promoCode"],
    usesLogo: false,
    defaultFinishes: ["ghost-text", "grain"],
    baseColor: (c) => c.ink,
    background: (c) =>
      `radial-gradient(120% 140% at 50% 20%, ${lighten(c.ink, 0.18)} 0%, ${c.ink} 55%, ${darken(c.ink, 0.2)} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: (c) => ({
      "ghost-text": { ghostText: c.f("offer").split(" ")[0] || "48", ghostSize: 420, ghostAlpha: 0.06, ghostAlign: "right", ghostX: -6, ghostFont: c.fonts.heading },
      grain: { grainAlpha: 0.08 },
    }),
    render: (ctx) => <Countdown ctx={ctx} />,
  },
  wordmark: {
    id: "wordmark",
    name: "Wordmark",
    purpose: "Just the name — clean, centered, refined.",
    fields: ["brand", "tagline"],
    usesLogo: false,
    defaultFinishes: [],
    baseColor: (c) => lighten(c.paper, 0.25),
    background: (c) => lighten(c.paper, 0.25),
    palette: (c) => ({ base: lighten(c.paper, 0.25) }),
    finishConfigs: () => ({}),
    render: (ctx) => <Wordmark ctx={ctx} />,
  },
  stat: {
    id: "stat",
    name: "Stat / proof",
    purpose: "Lead with a number — 500+ clients, 15 years.",
    fields: ["offer", "headline", "tagline", "brand"],
    usesLogo: false,
    defaultFinishes: ["blur-blob"],
    baseColor: (c) => lighten(c.paper, 0.2),
    background: (c) => lighten(c.paper, 0.2),
    palette: (c) => ({ base: lighten(c.paper, 0.2) }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: lighten(c.accent, 0.2), blobX: 20, blobY: 70, blobSize: 42, blobAlpha: 0.3 },
    }),
    render: (ctx) => <Stat ctx={ctx} />,
  },

  // ── WAVE 2 (2026-07-18, Lovable provider-kit inspirations) ─────────────────
  "provider-profile": {
    id: "provider-profile",
    name: "Provider profile",
    purpose: "Introduce a person — rounded photo, name, credential.",
    fields: ["eyebrow", "brand", "offer", "tagline", "contact"],
    usesLogo: false,
    photoMode: "panel",
    forcePanelStyle: "inset", // the rounded-inset crop is the whole point
    defaultFinishes: ["grain"],
    applicableFinishes: ["grain", "blur-blob"],
    baseColor: (c) => c.ink,
    // Deep diagonal panel. The card-separation glow is drawn BEHIND the rounded
    // photo card itself (see PhotoPanel inset branch, which reads accent), so it
    // haloes out from the card edges rather than sitting on the photo.
    background: (c) =>
      `linear-gradient(120deg, ${darken(c.ink, 0.15)} 0%, ${c.ink} 45%, ${lighten(c.ink, 0.12)} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: (c) => ({
      "blur-blob": { blobColor: lighten(c.accent, 0.2), blobX: 75, blobY: 78, blobSize: 44, blobAlpha: 0.3 },
      grain: { grainAlpha: 0.07 },
    }),
    render: (ctx) => <ProviderProfile ctx={ctx} />,
  },
  "testimonial-bold": {
    id: "testimonial-bold",
    name: "Testimonial (bold)",
    purpose: "A big quote, five stars — social proof that shouts.",
    fields: ["quote", "attribution", "brand"],
    usesLogo: false,
    defaultFinishes: [],
    applicableFinishes: ["keyline", "grain", "blur-blob"],
    baseColor: (c) => lighten(c.paper, 0.3),
    background: (c) => lighten(c.paper, 0.3),
    palette: (c) => ({ base: lighten(c.paper, 0.3) }),
    finishConfigs: (c) => ({ keyline: { keyColor: alpha(c.accent, 0.3), keyInset: 3 } }),
    render: (ctx) => <TestimonialBold ctx={ctx} />,
  },
  "how-it-works": {
    id: "how-it-works",
    name: "How it works",
    purpose: "Your steps — 2 to 4, one line each. Listen, test, treat.",
    fields: ["eyebrow", "brand"],
    usesLogo: false,
    usesSteps: true,
    defaultFinishes: ["grain"],
    applicableFinishes: ["grain", "blur-blob", "keyline"],
    baseColor: (c) => c.ink,
    background: (c) =>
      `radial-gradient(130% 130% at 15% 20%, ${lighten(c.ink, 0.14)} 0%, ${c.ink} 55%, ${darken(c.ink, 0.18)} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({ grain: { grainAlpha: 0.07 } }),
    render: (ctx) => <HowItWorks ctx={ctx} />,
  },
  "local-pride": {
    id: "local-pride",
    name: "Local pride",
    purpose: "Name your town — proudly caring for {city}.",
    fields: ["brand", "headline", "location"],
    usesLogo: false,
    defaultFinishes: [],
    applicableFinishes: ["grain", "keyline", "blur-blob"],
    baseColor: (c) => lighten(c.paper, 0.2),
    background: (c) =>
      `radial-gradient(120% 130% at 80% 50%, ${lighten(c.accent, 0.55)} 0%, ${lighten(c.paper, 0.2)} 55%)`,
    palette: (c) => ({ base: lighten(c.paper, 0.2) }),
    finishConfigs: () => ({}),
    render: (ctx) => <LocalPride ctx={ctx} />,
  },
  seasonal: {
    id: "seasonal",
    name: "Seasonal greeting",
    purpose: "A holiday note — warm, centered, from the team.",
    fields: ["headline", "brand"],
    usesLogo: false,
    defaultFinishes: ["keyline"],
    applicableFinishes: ["keyline", "grain", "blur-blob"],
    baseColor: (c) => lighten(c.paper, 0.3),
    background: (c) =>
      `radial-gradient(120% 130% at 50% 25%, ${lighten(c.paper, 0.4)} 0%, ${lighten(c.paper, 0.15)} 70%)`,
    palette: (c) => ({ base: lighten(c.paper, 0.3) }),
    finishConfigs: (c) => ({ keyline: { keyColor: alpha(c.accent, 0.35), keyInset: 3 } }),
    render: (ctx) => <Seasonal ctx={ctx} />,
  },
  "did-you-know": {
    id: "did-you-know",
    name: "Did you know?",
    purpose: "Teach one fact — an educational post.",
    fields: ["eyebrow", "headline", "tagline", "brand"],
    usesLogo: false,
    defaultFinishes: ["grain"],
    applicableFinishes: ["grain", "blur-blob", "keyline", "ghost-text"],
    baseColor: (c) => c.ink,
    background: (c) =>
      `linear-gradient(125deg, ${c.ink} 0%, ${lighten(c.ink, 0.1)} 55%, ${darken(c.ink, 0.1)} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({ grain: { grainAlpha: 0.07 } }),
    render: (ctx) => <DidYouKnow ctx={ctx} />,
  },
  milestone: {
    id: "milestone",
    name: "Milestone",
    purpose: "Mark an anniversary — a giant number, a thank-you.",
    fields: ["eyebrow", "offer", "headline", "tagline"],
    usesLogo: false,
    defaultFinishes: ["grain"],
    applicableFinishes: ["grain", "blur-blob", "keyline"],
    baseColor: (c) => c.ink,
    background: (c) =>
      `radial-gradient(130% 140% at 25% 25%, ${lighten(c.ink, 0.12)} 0%, ${c.ink} 55%, ${darken(c.ink, 0.2)} 100%)`,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({ grain: { grainAlpha: 0.07 } }),
    render: (ctx) => <Milestone ctx={ctx} />,
  },
  "behind-the-scenes": {
    id: "behind-the-scenes",
    name: "Behind the scenes",
    purpose: "Show the space — a full-bleed room with a soft line.",
    fields: ["eyebrow", "headline", "brand"],
    usesLogo: false,
    photoMode: "fullbleed",
    defaultFinishes: ["scrim", "grain"],
    applicableFinishes: ["scrim", "grain", "blur-blob"],
    baseColor: (c) => c.ink,
    background: (c) => c.ink,
    palette: (c) => ({ base: c.ink }),
    finishConfigs: () => ({
      scrim: { scrimSide: "left", scrimStrength: 0.78 },
      grain: { grainAlpha: 0.08 },
    }),
    render: (ctx) => <BehindTheScenes ctx={ctx} />,
  },
};

export const TEMPLATE_LIST: TemplateId[] = [
  // Photo-forward first — the newest, most-wanted capability leads the gallery.
  "provider-profile",
  "team-intro",
  "product-hero",
  "quote",
  "event",
  "behind-the-scenes",
  "split-feature",
  "brand-story",
  // Promo / action
  "promotion",
  "countdown",
  "cta",
  "announcement",
  // Proof / credibility
  "testimonial-bold",
  "testimonial",
  "stat",
  "milestone",
  "credential",
  "menu",
  // Story / education / seasonal
  "how-it-works",
  "did-you-know",
  "local-pride",
  "seasonal",
  // Brand / typographic
  "logo",
  "wordmark",
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

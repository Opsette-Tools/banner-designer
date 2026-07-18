# Banner Designer — carryover for the NEXT session (more templates + photo pixelation)

Written 2026-07-18 at the end of a long session. Banner Designer is live at
https://tools.opsette.io/banner-designer/ (repo `Opsette-Tools/banner-designer`,
port 8126). This doc briefs the NEXT session on two things Ruthnie explicitly
deferred to fresh eyes:

1. **More templates** — inspired by Lovable mockups she liked (described below).
2. **The photo-in-the-Position-pad pixelation** — still rough; needs a fresh look.

Read `BANNER-DESIGNER-BUILD-SPEC.md` (the model) first if you're new to the repo.
Everything below assumes that model (slot-mapped React/CSS templates, finish
stack, `photoMode`, per-platform template picks).

---

## What shipped THIS session (already committed)

- **Photo support** — a shared `PhotoSpec` on `BannerState` (`src/banner/model.ts`),
  consumed two ways via a template's `photoMode`:
  - `"panel"` — photo carved into one side behind a straight/diagonal/curve seam
    (`PhotoPanel` in `src/banner/photo.tsx`), with side toggle, zoom, and a
    drag-dot focal picker.
  - `"fullbleed"` — photo fills the whole banner behind a scrim (`FullBleedPhoto`).
  - Wired into the render node (`BannerCanvas.tsx`) + `TemplateContext`
    (`template-kit.ts`, `ctx.photo` / `ctx.hasPanel` / `ctx.photoZone`).
- **11 new templates** (`src/banner/templates.tsx`, registered in `TEMPLATES` +
  `TEMPLATE_LIST`):
  - Photo: **Team intro, Product hero, Quote, Event, Split feature**
  - Non-photo: **Announcement, Testimonial, Menu/prices, Countdown, Wordmark, Stat**
- **Photo controls** in the panel (`BannerPanel.tsx`): upload, side, divider,
  zoom slider (100–250%), and the `PhotoFocusPad` drag-dot widget.
- **Preview smoothness fixes** (these WORK — confirmed by Ruthnie):
  - Photo previews render the **full-resolution export PNG** as an `<img>` instead
    of CSS-`transform:scale()`-ing a live DOM subtree (which mottles a detailed
    photo). This is the same technique Icon Kit's old canvas build used, and why
    Brand Board (which shows the export PNG) was always smooth. See
    `useBannerBitmap` (`src/banner/use-banner-bitmap.ts`) — a cached,
    concurrency-limited render hook — and `BannerSmartPreview` / `BannerThumb`.
  - High-quality resize on upload + a one-time migration of oversized stored
    photos (`resizePhotoDataUrl` / `photoNeedsResize` in `photo.tsx`, migration
    effect in `BannerPanel.tsx`).

---

## STILL BROKEN: the Position-pad photo pixelation (hand to fresh eyes)

**Symptom:** the little square **Position** preview in the Photo controls (the
drag-the-dot focal pad) shows the photo ROUGH/pixelated and, unlike every other
surface, it "never settles into sharpness." The large preview, the size
thumbnails, and the template strip all settle sharp (live DOM first → crisp PNG
swaps in). The pad does not, because it has no PNG path — it shows the raw source
image directly.

**What was already tried (and did NOT fully fix the pad):**
- Switched the pad from `background-image` to a real `<img>` + `object-fit:cover`
  (browsers downsample `<img>` best). Helped elsewhere, not enough on the pad.
- High-quality canvas resize on upload (`imageSmoothingQuality:"high"`, cap
  1600px long edge).
- One-time migration so an ALREADY-stored oversized photo gets resized on load
  without re-upload.
- GPU layer promotion (`will-change`/`translateZ(0)`) on scaled nodes.

**Leading hypothesis for the next agent:** the pad is 132px square. Even a
1600px-capped source is a ~12× downscale in ONE step, and at that ratio the
single-step browser resample still aliases. The surfaces that look good don't
downscale the source that hard in one step — they show a PNG rendered at a size
much closer to display. **Likely fix:** give the pad the SAME bitmap treatment —
render a small (e.g. 264px) high-quality canvas thumbnail of the photo ONCE
(stepped downscale: halve repeatedly, or draw at 2× then let the browser do the
last gentle step) and show THAT in the pad, instead of the full-res source. A
stepped/mipmap-style downscale (draw to an intermediate canvas at 2× target,
then to target) is the classic cure for single-step aliasing.

**Do NOT** rabbit-hole the whole session on this — Ruthnie's priority for the
next session is MORE TEMPLATES. Fix the pad if it's quick; otherwise timebox it.

---

## NEW TEMPLATES Ruthnie wants (from Lovable mockups she liked)

She had Lovable generate a provider "kit" of banners and liked several. The
Banner Designer model is hand-built now (NOT Lovable), so we author these as new
entries in `templates.tsx` + `TEMPLATE_LIST` — no Lovable round-trip, no code
import needed. She'll bring the screenshots into the next session; here's what
she called out, described so you can build them data-driven:

1. **Provider profile** (photo) — like our Team intro but the photo is a
   **rounded-rectangle inset** (not a full-height carved seam) floated on a deep
   gradient panel, with an eyebrow ("MEET YOUR PROVIDER"), a big serif name with
   an italic-accent credential ("Your Name, *FNP-BC*"), two lines of
   role/specialty meta, and a small accent-rule + brand line. She specifically
   **likes the rounded-photo crop** — worth adding as a photo-panel *style*
   option (rounded inset vs. the current full-bleed seam), maybe a new
   `panelStyle: "seam" | "inset"` on PhotoSpec.

2. **Testimonial #2** (text) — she wants a SECOND testimonial layout distinct
   from our current one. Lovable's: a giant faint quote-mark top-left, a very
   large multi-line serif quote as the hero, a 5-gold-star row + small
   "REAL PATIENT, REAL RESULT" attribution bottom-left, brand bottom-right on a
   pale card. Consider renaming ours "Testimonial" → keep both as
   "Testimonial (quiet)" and "Testimonial (bold)".

3. **How it works / 3-step** — a deep panel with big faint numerals **01 02 03**
   across a connecting hairline, each with a bold step title (Listen / Test /
   Treat) + a line of copy under it. New field shape needed: three (title, body)
   pairs. Parse from a textarea like the Menu template does, or add step fields.

4. **Local pride** (text) — a big **map-pin glyph** watermark on one side, brand
   eyebrow, and a huge serif "Proudly caring for *Portland*." with an
   italic-accent city. Simple + charming.

5. **Seasonal greeting** (text) — pale card, centered big serif italic-accent
   greeting ("Wishing you a season *of* health and rest."), small centered
   "FROM ALL OF US AT ..." line. A holiday/seasonal slot.

6. **Education / "Did you know?"** (text) — deep panel, small gold "DID YOU
   KNOW?" eyebrow, a large serif hero with a "not *against*" italic accent, one
   supporting line, brand bottom-right. (Note our copy guide bans the "not X but
   Y" construction in OUR marketing voice — but here it's user-entered CONTENT,
   so it's fine as a template that can hold whatever the user types.)

7. **Milestone / anniversary** (text) — deep panel with a GIANT ghost numeral
   ("5") bleeding off the right, eyebrow "ANNIVERSARY", serif "5 years of
   *listening first*." + a thank-you line. Close to our Stat template but
   anniversary-framed with the ghost number treatment — could be a variant.

8. **Behind the scenes** (fullbleed photo) — a real room/office photo full-bleed
   with a left scrim, "WHAT A VISIT LOOKS LIKE" eyebrow, a big serif
   "No rush. / No scripts. / *Just you.*" stacked hero, brand meta bottom-right.
   Basically our Event/Brand-story family but tuned for an interior/atmosphere
   photo rather than a face.

**Common threads she likes:** rounded photo crops, italic-accent last word in
serif headlines (we already do this via `AccentHeadline`), big faint ghost
numerals/marks, and gold-on-deep meta lines. Lean into those.

---

## Suggested next-session order
1. Quick timebox on the Position-pad pixelation (stepped-downscale thumbnail).
2. Build the 8 templates above. Add `panelStyle: "seam" | "inset"` to PhotoSpec
   for the rounded-inset provider look (#1) — it's the one structural addition;
   the rest are compositions + maybe a 3-step field shape (#3).
3. Update `TEMPLATE_LIST` grouping, verify each at all 4 platform sizes, build,
   commit as `deebuilt`, push (Actions redeploys).

## House rules reminder for the working agent
- Typecheck: `npx tsc --noEmit` (flat tsconfig — NOT `tsc -b`; that's Icon Kit).
- Don't run the full `npm run build` until verify-then-commit.
- Commit as `deebuilt` (personal). Use repeated `-m` flags, never a here-string.
- Verify in the running app before committing; Ruthnie says GO before push.

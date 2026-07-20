import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  ColorPicker,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Slider,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { UploadProps } from "antd";
import { Upload } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";

import {
  FIELDS,
  FINISHES,
  PLATFORMS,
  bannerInitial,
  finishLabel,
  activeTemplateId,
  activeFinishes,
  MIN_STEPS,
  MAX_STEPS,
  type BannerState,
  type FieldKey,
  type FinishKind,
  type PlatformId,
} from "./model";
import {
  BANNER_KEY,
  bannerReducer,
  hydrate,
  looksLikeBanner,
} from "./state";
import { TEMPLATE_LIST, getTemplate, applicableFinishesFor } from "./templates";
import { BannerSmartPreview, BannerNode, scaledLayerStyle } from "./BannerCanvas";
import { loadPhotoFile, resizePhotoDataUrl, photoNeedsResize, makePhotoThumb } from "./photo";
import { BannerThumb } from "./BannerThumb";
import { renderPlatformAsset } from "./render-offscreen";
import { dataUrlToBlob } from "./export";
import { buildCombinedExport } from "@/lib/icon-kit/export-assets";
import { isEmbedded } from "@/lib/opsette-kit-link";
import { downloadBlob } from "@/lib/icon-kit/download";
import { fromSocialKitJson, configForTab } from "@/lib/icon-kit/brand-kit";
import { loadPairing, getPairing } from "@/lib/shared-fonts";
import { OpsetteFontPicker } from "@/components/opsette-font-picker";
import { usePersistentReducer } from "@/hooks/use-persistent-reducer";
import { SectionCard } from "@/components/icon-kit/SectionCard";

// ── Finish stack control: multiselect + reorder (model change #2) ─────────────
function FinishStackControl({
  active,
  applicable,
  onToggle,
  onMove,
  onReset,
}: {
  active: FinishKind[];
  /** The finishes this template can actually express — the only ones offered. */
  applicable: FinishKind[];
  onToggle: (k: FinishKind) => void;
  onMove: (k: FinishKind, dir: -1 | 1) => void;
  onReset: () => void;
}) {
  // Only offer finishes that DO something on this template (no dead toggles).
  const addable = FINISHES.filter((f) => applicable.includes(f.kind) && !active.includes(f.kind));
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Layer as many as you like — drawn back to front. The template starts with a
        designed set; add, drop, or reorder from there.
      </Typography.Text>

      {/* Active stack, in draw order, with reorder controls. */}
      {active.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {active.map((kind, i) => (
            <div
              key={kind}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                border: "1px solid #d9e5e0",
                borderRadius: 8,
                background: "#f7faf8",
              }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                <span style={{ color: "#8aa79b", marginRight: 8 }}>{i + 1}</span>
                {finishLabel(kind)}
              </span>
              <Tooltip title="Move back">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  disabled={i === 0}
                  onClick={() => onMove(kind, -1)}
                />
              </Tooltip>
              <Tooltip title="Move forward">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  disabled={i === active.length - 1}
                  onClick={() => onMove(kind, 1)}
                />
              </Tooltip>
              <Button size="small" type="text" danger onClick={() => onToggle(kind)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add finishes not yet in the stack. */}
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Add a finish
        </Typography.Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {addable.map((f) => (
            <Tooltip key={f.kind} title={f.hint}>
              <Button size="small" onClick={() => onToggle(f.kind)}>
                + {f.label}
              </Button>
            </Tooltip>
          ))}
          {addable.length === 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              All finishes for this template are added.
            </Typography.Text>
          )}
        </div>
      </div>

      <Button size="small" icon={<ReloadOutlined />} onClick={onReset}>
        Reset to template default
      </Button>
    </Space>
  );
}

// ── Photo focus pad: drag a dot to set the focal point (focusX/focusY) ────────
// A square preview of the photo with a draggable dot. Dragging sets focusX/Y in
// 0..1 via pointer events on window (so the drag continues outside the pad).
function PhotoFocusPad({
  dataUrl,
  focusX,
  focusY,
  onChange,
}: {
  dataUrl: string;
  focusX: number;
  focusY: number;
  onChange: (x: number, y: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Show a stepped-downscale thumbnail instead of the full-res source, so the
  // pad settles crisp like every other surface (the raw source scaled 12× in one
  // step aliased and "never settled"). Falls back to the source until ready.
  const [thumb, setThumb] = useState<string>(dataUrl);
  useEffect(() => {
    let alive = true;
    setThumb(dataUrl); // show something immediately while the thumb renders
    makePhotoThumb(dataUrl).then((t) => {
      if (alive && t) setThumb(t);
    });
    return () => {
      alive = false;
    };
  }, [dataUrl]);

  useEffect(() => {
    function setFromEvent(e: PointerEvent) {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      onChange(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
    }
    function move(e: PointerEvent) {
      if (draggingRef.current) setFromEvent(e);
    }
    function up() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onChange]);

  return (
    <div>
      <div
        ref={padRef}
        onPointerDown={(e) => {
          draggingRef.current = true;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
          onChange(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
        }}
        style={{
          position: "relative",
          width: 132,
          height: 132,
          borderRadius: 10,
          border: "1px solid #d9e5e0",
          overflow: "hidden",
          cursor: "crosshair",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* A real <img> (not background-image) downsamples most cleanly in the
            browser, so the pad stays crisp even for a large source photo. */}
        <img
          src={thumb}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${focusX * 100}%`,
            top: `${focusY * 100}%`,
            width: 22,
            height: 22,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "3px solid #fff",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        />
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6, maxWidth: 200 }}>
        Drag the dot onto what you want kept in frame — put it on the face, then set zoom.
      </Typography.Text>
    </div>
  );
}

// ── Photo controls: upload + side/divider/zoom/focal (shown for photo templates)
function PhotoControls({
  photo,
  mode,
  forcedPanelStyle,
  onUpload,
  onRemove,
  onPatch,
}: {
  photo: BannerState["photo"];
  mode: "panel" | "fullbleed";
  /** When the active template FORCES a panel style, the seam/inset toggle is
   *  hidden and this style is the one in effect. */
  forcedPanelStyle?: BannerState["photo"]["panelStyle"];
  onUpload: (file: File) => void;
  onRemove: () => void;
  onPatch: (patch: Partial<BannerState["photo"]>) => void;
}) {
  // The style actually in effect: template force wins, else the user's choice.
  const effectiveStyle = forcedPanelStyle ?? photo.panelStyle ?? "seam";
  const uploadProps: UploadProps = {
    accept: "image/png,image/jpeg,image/webp",
    showUploadList: false,
    beforeUpload: (file) => {
      onUpload(file);
      return false;
    },
  };
  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Space>
        <Upload {...uploadProps}>
          <Button icon={<InboxOutlined />}>{photo.dataUrl ? "Replace photo" : "Upload photo"}</Button>
        </Upload>
        {photo.dataUrl && (
          <Button type="link" onClick={onRemove}>
            Remove
          </Button>
        )}
      </Space>
      {!photo.dataUrl && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {mode === "panel"
            ? "Upload a person or product photo — it carves into one side of the banner."
            : "Upload a photo — it fills the banner behind your text."}
        </Typography.Text>
      )}

      {photo.dataUrl && (
        <>
          {/* Side + style + divider only matter for the carved panel layout. */}
          {mode === "panel" && (
            <>
              <LabeledField label="Photo side">
                <Segmented
                  block
                  value={photo.side}
                  onChange={(v) => onPatch({ side: v as "left" | "right" })}
                  options={[
                    { label: "Left", value: "left" },
                    { label: "Right", value: "right" },
                  ]}
                />
              </LabeledField>
              {/* Seam-carved vs. rounded-inset card — hidden when the template forces one. */}
              {!forcedPanelStyle && (
                <LabeledField label="Photo style">
                  <Segmented
                    block
                    value={photo.panelStyle ?? "seam"}
                    onChange={(v) => onPatch({ panelStyle: v as BannerState["photo"]["panelStyle"] })}
                    options={[
                      { label: "Carved seam", value: "seam" },
                      { label: "Rounded card", value: "inset" },
                    ]}
                  />
                </LabeledField>
              )}
              {/* Divider shape only applies to the carved-seam style. */}
              {effectiveStyle === "seam" && (
                <LabeledField label="Divider shape">
                  <Segmented
                    block
                    value={photo.divider}
                    onChange={(v) => onPatch({ divider: v as BannerState["photo"]["divider"] })}
                    options={[
                      { label: "Straight", value: "straight" },
                      { label: "Diagonal", value: "diagonal" },
                      { label: "Curve", value: "curve" },
                    ]}
                  />
                </LabeledField>
              )}
            </>
          )}
          <LabeledField label="Zoom">
            <Slider
              min={100}
              max={250}
              value={Math.round(photo.zoom * 100)}
              tooltip={{ formatter: (v) => `${v}%` }}
              onChange={(v) => onPatch({ zoom: (v as number) / 100 })}
            />
          </LabeledField>
          <LabeledField label="Position">
            <PhotoFocusPad
              dataUrl={photo.dataUrl}
              focusX={photo.focusX}
              focusY={photo.focusY}
              onChange={(x, y) => onPatch({ focusX: x, focusY: y })}
            />
          </LabeledField>
        </>
      )}
    </Space>
  );
}

// ── Steps editor: add/remove up to MAX_STEPS (title + body) rows ──────────────
// Shown for templates that declare `usesSteps` (How it works). A real structured
// editor, not a text blob — the layout reads the same list the user edits here.
function StepsEditor({
  steps,
  onSet,
  onAdd,
  onRemove,
}: {
  steps: BannerState["steps"];
  onSet: (index: number, patch: { title?: string; body?: string }) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Two to four steps. Each shows a number, a short title, and one line under it.
      </Typography.Text>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #d9e5e0",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#f7faf8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8aa79b" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <Input
              placeholder="Step title (e.g. Listen)"
              value={step.title}
              onChange={(e) => onSet(i, { title: e.target.value })}
            />
            <Button
              size="small"
              type="text"
              danger
              disabled={steps.length <= MIN_STEPS}
              onClick={() => onRemove(i)}
            >
              Remove
            </Button>
          </div>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 2 }}
            placeholder="One line about this step"
            value={step.body}
            onChange={(e) => onSet(i, { body: e.target.value })}
          />
        </div>
      ))}
      {steps.length < MAX_STEPS && (
        <Button size="small" icon={<InboxOutlined />} onClick={onAdd}>
          Add step
        </Button>
      )}
    </Space>
  );
}

// ── Template strip: a horizontal, scrollable gallery (like Signature Studio) ──
// Sits at the top, full width, so it's out of the way and can grow past 8. Each
// card previews the REAL composition and is scoped to the ACTIVE platform.
function TemplateStrip({
  state,
  activeId,
  platformLabel,
  onSelect,
}: {
  state: BannerState;
  activeId: string;
  platformLabel: string;
  onSelect: (id: (typeof TEMPLATE_LIST)[number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLButtonElement>(`[data-tpl="${activeId}"]`);
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const scroll = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <div className="tpl-strip">
      <div className="tpl-strip__head">
        <div className="tpl-strip__title">Template</div>
        <div className="tpl-strip__sub">
          for your <strong>{platformLabel}</strong> — each size can wear a different one
        </div>
      </div>
      <div className="tpl-strip__body">
        <Button
          className="tpl-strip__nav tpl-strip__nav--left"
          shape="circle"
          size="small"
          icon={<LeftOutlined />}
          onClick={() => scroll(-1)}
          aria-label="Scroll templates left"
        />
        <div className="tpl-strip__track" ref={trackRef}>
          {TEMPLATE_LIST.map((id) => {
            const t = getTemplate(id);
            const selected = id === activeId;
            return (
              <button
                key={id}
                type="button"
                data-tpl={id}
                className={`tpl-strip__card${selected ? " is-selected" : ""}`}
                onClick={() => onSelect(id)}
                aria-pressed={selected}
                title={t.purpose}
              >
                <BannerThumb state={state} templateId={id} />
                <div className="tpl-strip__name">{t.name}</div>
              </button>
            );
          })}
        </div>
        <Button
          className="tpl-strip__nav tpl-strip__nav--right"
          shape="circle"
          size="small"
          icon={<RightOutlined />}
          onClick={() => scroll(1)}
          aria-label="Scroll templates right"
        />
      </div>
    </div>
  );
}

// ── All-sizes filmstrip: see every platform's assigned template at once ───────
// Answers "what did I pick for which size?" — four live thumbnails, each labeled
// with its platform + assigned template, the focused one highlighted. Clicking a
// thumb focuses that platform (same as the preview tabs), so it doubles as nav.
function PlatformFilmstrip({
  state,
  onFocus,
}: {
  state: BannerState;
  onFocus: (id: PlatformId) => void;
}) {
  return (
    <div className="size-strip">
      {PLATFORMS.map((p) => {
        const tplId = state.templates[p.id];
        const t = getTemplate(tplId);
        const active = state.platform === p.id;
        // A per-platform view of the design so each thumb shows ITS template.
        const scoped: BannerState = { ...state, platform: p.id };
        return (
          <button
            key={p.id}
            type="button"
            className={`size-strip__card${active ? " is-active" : ""}`}
            onClick={() => onFocus(p.id)}
            title={`${p.label} — ${t.name}`}
          >
            <div className="size-strip__thumb">
              <BannerNodeThumb state={scoped} />
            </div>
            <div className="size-strip__meta">
              <span className="size-strip__platform">{p.label}</span>
              <span className="size-strip__tpl">{t.name}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// A tiny thumbnail of a specific platform's current design (its own ratio).
// Uses the smart preview so a photo design is the smooth export bitmap, not a
// hard DOM downscale (which mottles worst at thumbnail size).
function BannerNodeThumb({ state }: { state: BannerState }) {
  return <BannerSmartPreview state={state} radius={5} shadow={false} />;
}

// ── The panel ─────────────────────────────────────────────────────────────────
export function BannerPanel() {
  // Running inside the Brand Board iframe drawer? Then the clipboard "Export to
  // Brand Board" button is both redundant AND broken — a sandboxed iframe can't
  // write the clipboard, and the drawer's own "Save to Brand Board" bar already
  // posts the identical blob back via postMessage. So hide the clipboard export
  // when embedded; it stays for the standalone tool where clipboard IS the path.
  const embedded = useMemo(() => isEmbedded(), []);
  const [state, dispatch] = usePersistentReducer(BANNER_KEY, bannerReducer, bannerInitial, hydrate);
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenText, setReopenText] = useState("");

  const activeId = activeTemplateId(state);
  const tpl = getTemplate(activeId);
  const photoMode = tpl.photoMode ?? "none";
  const platformDef = PLATFORMS.find((p) => p.id === state.platform)!;

  async function onPhotoUpload(file: File) {
    try {
      const dataUrl = await loadPhotoFile(file);
      dispatch({ type: "patchPhoto", patch: { dataUrl } });
    } catch {
      message.error("Could not read that image");
    }
  }

  // Load the design's font pairing so previews draw with it (idempotent).
  useEffect(() => {
    loadPairing(getPairing(state.fontId));
  }, [state.fontId]);

  // Migrate an oversized stored photo (uploaded before the resize existed) down
  // to the high-quality capped version — so the focus pad and every raw-source
  // surface stays crisp WITHOUT the user re-uploading. Runs once per distinct
  // photo; the resize is idempotent (already-small photos are left untouched).
  const migratedPhotoRef = useRef<string | null>(null);
  useEffect(() => {
    const url = state.photo.dataUrl;
    if (!url || migratedPhotoRef.current === url) return;
    let cancelled = false;
    (async () => {
      if (!(await photoNeedsResize(url))) {
        migratedPhotoRef.current = url;
        return;
      }
      const resized = await resizePhotoDataUrl(url);
      if (cancelled || resized === url) return;
      migratedPhotoRef.current = resized;
      dispatch({ type: "patchPhoto", patch: { dataUrl: resized } });
    })();
    return () => {
      cancelled = true;
    };
  }, [state.photo.dataUrl]);

  const logoUpload: UploadProps = {
    accept: "image/png,image/jpeg,image/svg+xml",
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        dispatch({ type: "patch", patch: { logoDataUrl: String(e.target?.result || "") } });
      reader.readAsDataURL(file);
      return false;
    },
  };

  async function downloadCurrent() {
    setBusy(true);
    try {
      const platform = PLATFORMS.find((p) => p.id === state.platform)!;
      const asset = await renderPlatformAsset(state, platform);
      downloadBlob(dataUrlToBlob(asset.image), platform.file);
      message.success(`Downloaded ${platform.file}`);
    } catch (e) {
      console.error(e);
      message.error("Could not generate the image");
    } finally {
      setBusy(false);
    }
  }

  async function downloadAll() {
    setBusy(true);
    try {
      for (const platform of PLATFORMS) {
        const asset = await renderPlatformAsset(state, platform);
        downloadBlob(dataUrlToBlob(asset.image), platform.file);
      }
      message.success(`Downloaded ${PLATFORMS.length} sizes`);
    } catch (e) {
      console.error(e);
      message.error("Could not generate the images");
    } finally {
      setBusy(false);
    }
  }

  async function exportToBoard() {
    setBusy(true);
    try {
      const { json, assetCount } = await buildCombinedExport(state);
      if (assetCount === 0) {
        message.info("Design something first — then export.");
        return;
      }
      await navigator.clipboard.writeText(json);
      message.success(
        `Copied ${assetCount} banner size(s) — paste into Brand Board, or back into “Reopen” to revise later`,
      );
    } catch (e) {
      console.error(e);
      message.error("Could not export to Brand Board");
    } finally {
      setBusy(false);
    }
  }

  function reopenFromBlob(raw: string): boolean {
    // Accept a bare BannerState pasted straight from localStorage too.
    try {
      const bare = JSON.parse(raw.trim());
      if (bare && typeof bare === "object" && looksLikeBanner(bare)) {
        dispatch({ type: "patch", patch: hydrate(bare) });
        message.success("Design reopened — every control is restored.");
        return true;
      }
    } catch {
      /* not bare JSON — fall through */
    }
    const parsed = fromSocialKitJson(raw);
    if (!parsed) {
      message.error("That doesn't look like a Banner Designer export.");
      return false;
    }
    const config = configForTab(parsed, "social", looksLikeBanner);
    if (!config) {
      message.warning(
        "This blob has the images but no saved settings. Re-export from a current design to reopen it.",
      );
      return false;
    }
    dispatch({ type: "patch", patch: hydrate(config as Partial<BannerState>) });
    message.success("Design reopened — every control is restored.");
    return true;
  }

  return (
    <div className="banner-layout">
      {/* Header row: intro + reset/reopen */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 13, flex: 1, minWidth: 220 }}>
          Pick a template for what the banner is <em>for</em>, fill the fields, layer
          finishes, and tune your colors. Every size renders from one design.
        </Typography.Paragraph>
        <Space wrap>
          <Popconfirm
            title="Reset the whole design?"
            description="Clears everything back to defaults. This can't be undone."
            okText="Reset everything"
            okButtonProps={{ danger: true }}
            cancelText="Keep it"
            onConfirm={() => {
              dispatch({ type: "reset" });
              message.success("Everything reset to defaults");
            }}
          >
            <Button danger icon={<ReloadOutlined />}>
              Reset
            </Button>
          </Popconfirm>
          <Button icon={<FolderOpenOutlined />} onClick={() => setReopenOpen(true)}>
            Reopen
          </Button>
        </Space>
      </div>

      <ReopenModal
        open={reopenOpen}
        text={reopenText}
        onText={setReopenText}
        onCancel={() => {
          setReopenOpen(false);
          setReopenText("");
        }}
        onOk={() => {
          if (reopenFromBlob(reopenText)) {
            setReopenOpen(false);
            setReopenText("");
          }
        }}
      />

      {/* Template strip — full width, at the top, scrollable + out of the way. */}
      <TemplateStrip
        state={state}
        activeId={activeId}
        platformLabel={platformDef.label}
        onSelect={(id) => dispatch({ type: "selectTemplate", id })}
      />

      <div className="banner-split">
        {/* ── Controls column ─────────────────────────────────────────────── */}
        <Space direction="vertical" size={16} style={{ width: "100%" }} className="banner-controls-col">
          {/* 1. Smart fields — only the active template's slots, each labeled */}
          <SectionCard title="1. Content" collapsible>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {tpl.fields.map((key) => {
                const def = FIELDS[key];
                return (
                  <LabeledField key={key} label={def.label}>
                    {def.long ? (
                      <Input.TextArea
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        placeholder={def.placeholder}
                        value={state.fields[key]}
                        onChange={(e) => dispatch({ type: "setField", key, value: e.target.value })}
                      />
                    ) : (
                      <Input
                        placeholder={def.placeholder}
                        value={state.fields[key]}
                        onChange={(e) => dispatch({ type: "setField", key, value: e.target.value })}
                      />
                    )}
                  </LabeledField>
                );
              })}
              {tpl.usesSteps && (
                <StepsEditor
                  steps={state.steps}
                  onSet={(index, patch) => dispatch({ type: "setStep", index, patch })}
                  onAdd={() => dispatch({ type: "addStep" })}
                  onRemove={(index) => dispatch({ type: "removeStep", index })}
                />
              )}
              {tpl.usesLogo && (
                <div style={{ marginTop: 4 }}>
                  <Space>
                    <Upload {...logoUpload}>
                      <Button icon={<InboxOutlined />}>
                        {state.logoDataUrl ? "Replace logo" : "Upload logo"}
                      </Button>
                    </Upload>
                    {state.logoDataUrl && (
                      <Button type="link" onClick={() => dispatch({ type: "patch", patch: { logoDataUrl: null } })}>
                        Remove
                      </Button>
                    )}
                  </Space>
                  {!state.logoDataUrl && (
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                      No logo yet — a monogram from your business name stands in.
                    </Typography.Text>
                  )}
                </div>
              )}
            </Space>
          </SectionCard>

          {/* Photo — only for templates that use one (panel or full-bleed). */}
          {photoMode !== "none" && (
            <SectionCard title="Photo" collapsible>
              <PhotoControls
                photo={state.photo}
                mode={photoMode}
                forcedPanelStyle={tpl.forcePanelStyle}
                onUpload={onPhotoUpload}
                onRemove={() => dispatch({ type: "patchPhoto", patch: { dataUrl: null } })}
                onPatch={(patch) => dispatch({ type: "patchPhoto", patch })}
              />
            </SectionCard>
          )}

          {/* 2. Palette */}
          <SectionCard title="2. Colors" collapsible>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <ColorRow label="Deep" hint="The dark brand color" value={state.ink} onChange={(hex) => dispatch({ type: "patch", patch: { ink: hex } })} />
              <ColorRow label="Accent" hint="Tints finishes and accent words" value={state.accent} onChange={(hex) => dispatch({ type: "patch", patch: { accent: hex } })} />
              <ColorRow label="Light" hint="The pale brand color / paper" value={state.paper} onChange={(hex) => dispatch({ type: "patch", patch: { paper: hex } })} />
            </Space>
          </SectionCard>

          {/* 3. Type */}
          <SectionCard title="3. Type" collapsible>
            <OpsetteFontPicker value={state.fontId} onChange={(id) => dispatch({ type: "patch", patch: { fontId: id } })} />
          </SectionCard>

          {/* 4. Finishes — for the ACTIVE platform */}
          <SectionCard title={`4. Finishes — ${platformDef.label}`} collapsible>
            <FinishStackControl
              active={activeFinishes(state)}
              applicable={applicableFinishesFor(activeId)}
              onToggle={(k) => dispatch({ type: "toggleFinish", kind: k })}
              onMove={(k, dir) => dispatch({ type: "moveFinish", kind: k, dir })}
              onReset={() => dispatch({ type: "resetFinishes" })}
            />
          </SectionCard>
        </Space>

        {/* ── Preview column ──────────────────────────────────────────────── */}
        <div className="banner-preview-col">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <SectionCard title="Preview" primary>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Segmented
                  block
                  value={state.platform}
                  onChange={(v) => dispatch({ type: "setPlatform", id: v as PlatformId })}
                  options={PLATFORMS.map((p) => ({ label: p.label, value: p.id }))}
                />
                <BannerSmartPreview state={state} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {`${platformDef.w} × ${platformDef.h} — exports at full resolution.`}
                </Typography.Text>

                {/* All-sizes overview — every platform's assigned template, at a
                    glance. The focused one is ringed; click any to switch. */}
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>
                    All sizes — tap one to edit it
                  </Typography.Text>
                  <PlatformFilmstrip state={state} onFocus={(id) => dispatch({ type: "setPlatform", id })} />
                </div>
              </Space>
            </SectionCard>

            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {!embedded && (
                <Button icon={<ExportOutlined />} size="large" loading={busy} onClick={exportToBoard} block>
                  Export to Brand Board
                </Button>
              )}
              <Button icon={<DownloadOutlined />} size="large" loading={busy} onClick={downloadCurrent} block type="primary">
                Download this size (PNG)
              </Button>
              <Button size="large" loading={busy} onClick={downloadAll} block>
                Download all {PLATFORMS.length} sizes
              </Button>
            </Space>
          </Space>
        </div>
      </div>

      {/* Hidden node kept mounted so fonts for the current design are always warm. */}
      <div aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
        <WarmFonts state={state} />
      </div>
    </div>
  );
}

// Keeps the active font pairing rasterized by rendering a tiny live node off-screen.
function WarmFonts({ state }: { state: BannerState }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ transform: "scale(0.01)", transformOrigin: "top left" }}>
      <BannerNode ref={ref} state={state} />
    </div>
  );
}

// A field with a small label above it, so the editor never shows bare inputs.
function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Typography.Text style={{ fontSize: 12, fontWeight: 600, color: "#5a7268", display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
      {children}
    </div>
  );
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Space>
      <span style={{ minWidth: 56, display: "inline-block", fontWeight: 500 }}>{label}</span>
      <ColorPicker value={value} onChange={(c) => onChange(c.toHexString())} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {hint}
      </Typography.Text>
    </Space>
  );
}

function ReopenModal({
  open,
  text,
  onText,
  onCancel,
  onOk,
}: {
  open: boolean;
  text: string;
  onText: (v: string) => void;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      title="Reopen a saved design"
      open={open}
      onCancel={onCancel}
      okText="Reopen"
      onOk={onOk}
      okButtonProps={{ disabled: !text.trim() }}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Paste an <b>Export to Brand Board</b> blob (from this tool) to rebuild the
        whole design — template, content, colors, fonts and finishes. It's the same
        blob you'd paste into Brand Board.
      </Typography.Paragraph>
      <Input.TextArea
        rows={6}
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder='{"type":"social","v":1,"source":"opsette","data":{...}}'
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
      />
    </Modal>
  );
}

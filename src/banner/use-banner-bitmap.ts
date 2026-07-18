// A cached, concurrency-limited "render this BannerState to a PNG" hook.
//
// The template gallery shows ~19 cards at once; the large preview + filmstrip
// already render bitmaps. Rendering all of them live on every keystroke would be
// far too heavy, so this hook:
//   • caches a rendered PNG by a signature of the pixel-affecting state, so an
//     unchanged card never re-renders (the gallery is stable while you type in
//     one platform — only colours/fonts/photo shift them, rarely),
//   • funnels all renders through a small queue (max N in flight) so 19 cards
//     don't stampede the main thread,
//   • returns the cached PNG synchronously on a cache hit (no flicker).
//
// Text/finish-only thumbnails downscale fine as DOM, so callers only opt into
// the bitmap path when a photo is actually present — that keeps the cost paid
// only where it matters.

import { useEffect, useState } from "react";
import { renderPlatformAsset } from "./render-offscreen";
import { getPlatform, type BannerState } from "./model";

const cache = new Map<string, string>();
const CACHE_MAX = 120; // plenty for the gallery + filmstrip; LRU-ish trim below

let inFlight = 0;
const MAX_IN_FLIGHT = 3;
const queue: (() => void)[] = [];

function pump() {
  while (inFlight < MAX_IN_FLIGHT && queue.length > 0) {
    const job = queue.shift()!;
    job();
  }
}

function enqueue(job: () => Promise<void>) {
  const run = () => {
    inFlight++;
    job().finally(() => {
      inFlight--;
      pump();
    });
  };
  queue.push(run);
  pump();
}

function put(key: string, val: string) {
  cache.set(key, val);
  if (cache.size > CACHE_MAX) {
    // drop the oldest ~10% (insertion order)
    const drop = Math.ceil(CACHE_MAX * 0.1);
    let i = 0;
    for (const k of cache.keys()) {
      if (i++ >= drop) break;
      cache.delete(k);
    }
  }
}

/** A stable signature of everything that changes the rendered pixels. */
function signature(state: BannerState): string {
  return JSON.stringify(state);
}

/**
 * Render `state` to a full-resolution PNG (via the export path) and return it,
 * cached. Returns the cached value synchronously if present (no flash). While a
 * fresh render is in flight, returns the last known PNG (or null) so the caller
 * can keep showing a live-DOM fallback underneath.
 */
export function useBannerBitmap(state: BannerState, enabled: boolean): string | null {
  const key = enabled ? signature(state) : "";
  const [png, setPng] = useState<string | null>(() => (key ? cache.get(key) ?? null : null));

  useEffect(() => {
    if (!enabled || !key) {
      setPng(null);
      return;
    }
    const hit = cache.get(key);
    if (hit) {
      setPng(hit);
      return;
    }
    let cancelled = false;
    const platform = getPlatform(state.platform);
    enqueue(async () => {
      if (cancelled) return;
      try {
        const asset = await renderPlatformAsset(state, platform);
        put(key, asset.image);
        if (!cancelled) setPng(asset.image);
      } catch {
        /* keep the DOM fallback */
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return png;
}

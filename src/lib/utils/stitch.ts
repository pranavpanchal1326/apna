// src/lib/utils/stitch.ts
// Pure geometry for the Stitch sew animation (Blueprint §2.6.3), extracted
// from the component so the reveal math is unit-testable without a renderer.
//
// The sew: a running-stitch line "draws on" from its origin. We animate SVG
// strokeDashoffset from `dashesRegion` → 0 over a dashArray of the form
//   "6 4 6 4 … 6 4  0 L"   (N dash/gap pairs, then a zero dash + full-length gap)
//
// Why it works (derivation):
//   Pattern period P = dashesRegion + L, where dashesRegion = N·PERIOD.
//   A path point p is visible iff (p + offset) mod P falls in [0, dashesRegion].
//   At offset = dashesRegion: (p + dashesRegion) for p∈[0,L] lands in
//     [dashesRegion, dashesRegion+L] = the full-length gap → nothing shows.
//   At offset = 0: p∈[0,L] lands in [0,L] ⊆ [0,dashesRegion] (since N=ceil,
//     dashesRegion ≥ L) → the running stitch is fully revealed.
//   In between, the visible region grows from the origin. Using ceil (not
//   round) guarantees dashesRegion ≥ L, so the final dash always reaches the
//   endpoint — with round() it can stop short.

export const STITCH_DASH = 6
export const STITCH_GAP = 4
export const STITCH_PERIOD = STITCH_DASH + STITCH_GAP
export const STITCH_WIDTH = 2

/** The resting (non-animated) running-stitch dash pattern. */
export const RESTING_DASH_ARRAY = `${STITCH_DASH} ${STITCH_GAP}`

export interface SewGeometry {
  /** Number of dash/gap pairs; ceil so the region covers the whole line. */
  dashCount: number
  /** dashCount · PERIOD. Also the initial strokeDashoffset for the sew. */
  dashesRegion: number
  /** strokeDasharray that reveals origin-first as the offset animates to 0. */
  dashArray: string
}

/**
 * Sew geometry for a line of the given length. `totalLength` must be > 0
 * (callers guard on measured layout); non-positive falls back to a single dash.
 */
export function computeSew(totalLength: number): SewGeometry {
  const dashCount = Math.max(1, Math.ceil(Math.max(0, totalLength) / STITCH_PERIOD))
  const dashesRegion = dashCount * STITCH_PERIOD
  const pattern = Array(dashCount).fill(RESTING_DASH_ARRAY).join(' ')
  return {
    dashCount,
    dashesRegion,
    dashArray: `${pattern} 0 ${totalLength}`,
  }
}

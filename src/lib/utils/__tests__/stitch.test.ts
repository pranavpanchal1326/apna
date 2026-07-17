import {
  computeSew,
  RESTING_DASH_ARRAY,
  STITCH_PERIOD,
} from '../stitch'

describe('computeSew', () => {
  it('covers the whole line — dashesRegion is never shorter than the line (the round() bug)', () => {
    // 243 is the pathological case: round(24.3)=24 → 240 < 243 (last dash lost).
    // ceil(24.3)=25 → 250 ≥ 243.
    for (const L of [1, 10, 95, 100, 243, 247, 601, 1000]) {
      const { dashesRegion } = computeSew(L)
      expect(dashesRegion).toBeGreaterThanOrEqual(L)
      expect(dashesRegion % STITCH_PERIOD).toBe(0)
    }
  })

  it('uses ceil for the dash count', () => {
    expect(computeSew(243).dashCount).toBe(25)
    expect(computeSew(240).dashCount).toBe(24)
    expect(computeSew(241).dashCount).toBe(25)
  })

  it('dashArray ends with a zero dash + full-length gap that masks [0, L] at the initial offset', () => {
    const L = 247
    const { dashArray, dashCount } = computeSew(L)
    expect(dashArray.endsWith(`0 ${L}`)).toBe(true)
    // N dash/gap pairs precede the trailing "0 L".
    const pairs = dashArray.slice(0, dashArray.length - ` 0 ${L}`.length)
    expect(pairs.split(RESTING_DASH_ARRAY).length - 1).toBe(dashCount)
  })

  it('at rest (offset 0) the visible region [0,L] lies within the dashes region [0, dashesRegion]', () => {
    // This is the invariant that guarantees the endpoint is reached.
    const { dashesRegion } = computeSew(247)
    expect(247).toBeLessThanOrEqual(dashesRegion)
  })

  it('guards non-positive length to a single dash', () => {
    expect(computeSew(0).dashCount).toBe(1)
    expect(computeSew(-5).dashCount).toBe(1)
  })
})

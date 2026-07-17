// src/lib/utils/amount.ts
// Pure semantics for the Amount primitive (Blueprint §2.2.4 / §3.0.4),
// extracted so the zero-crossing / sign behaviour is unit-testable.
//
// The rule these encode: color, sign and the sewn-shut strike-through describe
// the *target* value, never a mid-roll frame. A roll from −200 → +300 passes
// through zero, but must not flash the "settled" strike or flip its sign while
// the digits are still rolling.

export type AmountRole = 'zero' | 'positive' | 'negative' | 'neutral'

export interface AmountSemantics {
  /** True when the value is (effectively) zero, or `settled` was forced. */
  isZero: boolean
  /** Sign of the target value (ignores the animating display). */
  isPositive: boolean
  /** Which color role the digits take. `signed` splits pos/neg; else neutral. */
  role: AmountRole
  /** Show the leading `+` (positive & signed & non-zero). */
  showPlus: boolean
  /** Render the stitchDim strike-through ("sewn shut" ₹0). */
  showStrike: boolean
}

export function amountSemantics(
  value: number,
  opts: { signed?: boolean; settled?: boolean } = {},
): AmountSemantics {
  const { signed = false, settled = false } = opts
  // Round to paise before the zero test so 0.004 reads as zero, matching the
  // 2-decimal display precision.
  const isZero = settled || Math.round(value * 100) === 0
  const isPositive = value > 0

  const role: AmountRole = isZero
    ? 'zero'
    : signed
      ? (isPositive ? 'positive' : 'negative')
      : 'neutral'

  return {
    isZero,
    isPositive,
    role,
    showPlus: signed && isPositive && !isZero,
    showStrike: isZero,
  }
}

/** ₹ digit grouping — Indian locale, up to 2 decimals, always non-negative. */
export function formatAmountDigits(n: number): string {
  return Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

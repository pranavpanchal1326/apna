// src/lib/budget/__tests__/thresholds.test.ts
import { detectBudgetThresholdCrossing, getThresholdLabel } from '../thresholds'

const cross = (previousPercentUsed: number, nextPercentUsed: number) =>
  detectBudgetThresholdCrossing({ previousPercentUsed, nextPercentUsed })

describe('detectBudgetThresholdCrossing', () => {
  it('detects an upward crossing of 70', () => {
    expect(cross(65, 72)).toEqual({ crossed: true, threshold: 70, direction: 'up' })
  })

  it('detects an upward crossing of 90', () => {
    expect(cross(80, 91)).toEqual({ crossed: true, threshold: 90, direction: 'up' })
  })

  it('detects an upward crossing of 100', () => {
    expect(cross(95, 105)).toEqual({ crossed: true, threshold: 100, direction: 'up' })
  })

  it('returns the highest threshold when several are crossed at once', () => {
    expect(cross(50, 150)).toEqual({ crossed: true, threshold: 100, direction: 'up' })
  })

  it('treats reaching the threshold exactly as a crossing', () => {
    expect(cross(69, 70)).toEqual({ crossed: true, threshold: 70, direction: 'up' })
  })

  it('detects a downward crossing at the highest line actually crossed', () => {
    // 95 was above 90 but never above 100, so dropping to 60 crosses 90 downward
    expect(cross(95, 60)).toEqual({ crossed: true, threshold: 90, direction: 'down' })
  })

  it('detects a downward crossing of 100 when previously over budget', () => {
    expect(cross(105, 60)).toEqual({ crossed: true, threshold: 100, direction: 'down' })
  })

  it('prefers upward over downward when both directions technically apply', () => {
    // going 60 -> 95 crosses 70 and 90 upward; never downward
    expect(cross(60, 95).direction).toBe('up')
    expect(cross(60, 95).threshold).toBe(90)
  })

  it('reports no crossing when staying within the same band', () => {
    expect(cross(71, 75)).toEqual({ crossed: false, threshold: null, direction: null })
  })

  it('reports no crossing when nothing moves', () => {
    expect(cross(50, 50)).toEqual({ crossed: false, threshold: null, direction: null })
  })
})

describe('getThresholdLabel', () => {
  it('labels each threshold', () => {
    expect(getThresholdLabel(70)).toBe('70% used')
    expect(getThresholdLabel(90)).toBe('90% used')
    expect(getThresholdLabel(100)).toBe('Budget exceeded')
  })
})

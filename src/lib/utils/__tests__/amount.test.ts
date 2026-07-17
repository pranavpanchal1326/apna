import { amountSemantics, formatAmountDigits } from '../amount'

describe('amountSemantics', () => {
  it('derives sign and role from the target value', () => {
    expect(amountSemantics(300, { signed: true }).role).toBe('positive')
    expect(amountSemantics(-200, { signed: true }).role).toBe('negative')
    expect(amountSemantics(300).role).toBe('neutral') // unsigned
  })

  it('treats sub-paise values as zero (matches 2-decimal display)', () => {
    expect(amountSemantics(0.004).isZero).toBe(true)
    expect(amountSemantics(0.006).isZero).toBe(false)
  })

  it('forces the sewn-shut zero treatment when settled, even for non-zero', () => {
    const s = amountSemantics(999, { settled: true })
    expect(s.isZero).toBe(true)
    expect(s.role).toBe('zero')
    expect(s.showStrike).toBe(true)
    expect(s.showPlus).toBe(false)
  })

  it('only shows the leading + for signed positive non-zero', () => {
    expect(amountSemantics(300, { signed: true }).showPlus).toBe(true)
    expect(amountSemantics(300).showPlus).toBe(false) // unsigned
    expect(amountSemantics(-300, { signed: true }).showPlus).toBe(false)
    expect(amountSemantics(0, { signed: true }).showPlus).toBe(false)
  })

  it('the flicker guarantee: both endpoints of a zero-crossing roll are stable, non-zero states', () => {
    // −200 → +300 passes through 0 mid-roll; semantics of the endpoints never
    // report isZero, so the settled strike/sign flip cannot flash.
    expect(amountSemantics(-200, { signed: true }).showStrike).toBe(false)
    expect(amountSemantics(300, { signed: true }).showStrike).toBe(false)
  })
})

describe('formatAmountDigits', () => {
  it('groups in the Indian locale and is always non-negative', () => {
    expect(formatAmountDigits(-1234567)).toBe('12,34,567')
    expect(formatAmountDigits(1000)).toBe('1,000')
  })

  it('shows up to two decimals, trimming trailing zeros', () => {
    expect(formatAmountDigits(12.5)).toBe('12.5')
    expect(formatAmountDigits(12)).toBe('12')
  })
})

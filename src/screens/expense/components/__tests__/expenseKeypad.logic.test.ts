// Pure re-implementation of ExpenseKeypad's next-value logic, unit-tested.
// Keep in sync with ExpenseKeypad.press(). Guards the money-entry edge cases:
// leading zero, single decimal point, two-decimal cap, backspace.

function nextValue(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1)
  if (key === '.') {
    if (value.includes('.')) return value
    return value === '' ? '0.' : value + '.'
  }
  if (value.includes('.') && (value.split('.')[1]?.length ?? 0) >= 2) return value
  if (value === '0') return key
  return value + key
}

describe('ExpenseKeypad next-value logic', () => {
  it('replaces a lone leading zero instead of prefixing', () => {
    expect(nextValue('0', '5')).toBe('5')
  })
  it('starts a decimal from empty as 0.', () => {
    expect(nextValue('', '.')).toBe('0.')
  })
  it('allows only one decimal point', () => {
    expect(nextValue('12.5', '.')).toBe('12.5')
  })
  it('caps at two decimal places', () => {
    expect(nextValue('12.50', '5')).toBe('12.50')
    expect(nextValue('12.5', '5')).toBe('12.55')
  })
  it('appends normally', () => {
    expect(nextValue('12', '4')).toBe('124')
  })
  it('backspaces', () => {
    expect(nextValue('124', 'back')).toBe('12')
    expect(nextValue('', 'back')).toBe('')
  })
})

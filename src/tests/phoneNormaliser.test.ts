jest.mock('expo-contacts', () => ({
  Fields: { PhoneNumbers: 'phoneNumbers', Name: 'name' },
  getContactsAsync: jest.fn(),
}))

import { normalisePhoneNumber } from '@/lib/contacts/reader'

describe('normalisePhoneNumber — all Indian formats', () => {
  test('+91XXXXXXXXXX stays unchanged', () => {
    expect(normalisePhoneNumber('+919876543210')).toBe('+919876543210')
  })
  test('10-digit gets +91 prepended', () => {
    expect(normalisePhoneNumber('9876543210')).toBe('+919876543210')
  })
  test('0XXXXXXXXXX → +91XXXXXXXXXX', () => {
    expect(normalisePhoneNumber('09876543210')).toBe('+919876543210')
  })
  test('91XXXXXXXXXX → +91XXXXXXXXXX', () => {
    expect(normalisePhoneNumber('919876543210')).toBe('+919876543210')
  })
  test('number with spaces → normalised', () => {
    expect(normalisePhoneNumber('98765 43210')).toBe('+919876543210')
  })
  test('number with dashes → normalised', () => {
    expect(normalisePhoneNumber('98765-43210')).toBe('+919876543210')
  })
  test('number with brackets → normalised', () => {
    expect(normalisePhoneNumber('(98765) 43210')).toBe('+919876543210')
  })
  test('+1 US number → null', () => {
    expect(normalisePhoneNumber('+12125551234')).toBeNull()
  })
  test('international without +91 → null', () => {
    expect(normalisePhoneNumber('+447911123456')).toBeNull()
  })
  test('empty string → null', () => {
    expect(normalisePhoneNumber('')).toBeNull()
  })
  test('garbage string → null', () => {
    expect(normalisePhoneNumber('not-a-phone')).toBeNull()
  })
  test('8-digit number → null (too short)', () => {
    expect(normalisePhoneNumber('98765432')).toBeNull()
  })
  test('+91 not double-prepended', () => {
    const result = normalisePhoneNumber('+919876543210')
    expect(result).not.toContain('+9191')
  })
  test('landline 044-XXXXXXXX → null (not mobile)', () => {
    expect(normalisePhoneNumber('04423456789')).toBeNull()
  })
})

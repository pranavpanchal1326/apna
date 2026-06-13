jest.mock('expo-contacts', () => ({
  Fields: {
    PhoneNumbers: 'phoneNumbers',
    Name: 'name',
  },
  getContactsAsync: jest.fn(),
}))

import { normalisePhoneNumber } from '../lib/contacts/reader'

describe('normalisePhoneNumber', () => {
  test('+91XXXXXXXXXX → +91XXXXXXXXXX unchanged', () => {
    expect(normalisePhoneNumber('+919876543210')).toBe('+919876543210')
  })

  test('10-digit number → +91 prepended', () => {
    expect(normalisePhoneNumber('9876543210')).toBe('+919876543210')
  })

  test('0XXXXXXXXXX (11 digits) → +91XXXXXXXXXX', () => {
    expect(normalisePhoneNumber('09876543210')).toBe('+919876543210')
  })

  test('91XXXXXXXXXX (12 digits) → +91XXXXXXXXXX', () => {
    expect(normalisePhoneNumber('919876543210')).toBe('+919876543210')
  })

  test('international number → null', () => {
    // If not matching E.164 Indian format or 10-12 digit range, returns null
    expect(normalisePhoneNumber('+14155552671')).toBeNull()
  })

  test('garbage string → null', () => {
    expect(normalisePhoneNumber('garbage123')).toBeNull()
  })

  test('empty string → null', () => {
    expect(normalisePhoneNumber('')).toBeNull()
  })

  test('number with spaces and dashes → normalised', () => {
    expect(normalisePhoneNumber('+91 98765-43210')).toBe('+919876543210')
  })

  test('number with +91 already → not double-prefixed', () => {
    expect(normalisePhoneNumber('+919876543210')).toBe('+919876543210')
  })
})

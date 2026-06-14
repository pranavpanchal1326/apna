jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((_algo: string, _input: string) =>
    Promise.resolve('a'.repeat(64))  // mock 64-char hex SHA256
  ),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}))

import { hashPhoneNumber, truncateHashForLookup } from '@/lib/contacts/hasher'

describe('Contact Hasher', () => {
  test('truncateHashForLookup returns exactly 16 characters', () => {
    const hash = 'a'.repeat(64)
    expect(truncateHashForLookup(hash).length).toBe(16)
  })

  test('truncation takes first 16 chars', () => {
    const hash = '1234567890abcdef' + 'x'.repeat(48)
    expect(truncateHashForLookup(hash)).toBe('1234567890abcdef')
  })

  test('same input produces same hash', async () => {
    const h1 = await hashPhoneNumber('+919876543210')
    const h2 = await hashPhoneNumber('+919876543210')
    expect(h1).toBe(h2)
  })

  test('hash is lowercase', async () => {
    const h = await hashPhoneNumber('+919876543210')
    expect(h).toBe(h.toLowerCase())
  })

  test('hashPhoneNumbers processes array correctly', async () => {
    const { hashPhoneNumbers } = require('@/lib/contacts/hasher')
    const results = await hashPhoneNumbers(['+919876543210', '+918765432109'])
    expect(results.length).toBe(2)
  })
})

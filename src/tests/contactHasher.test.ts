// Mock expo-crypto using Node's native crypto module for realistic SHA-256 hashing
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn().mockImplementation((algorithm, data) => {
    if (algorithm === 'SHA-256') {
      const crypto = require('crypto')
      const hash = crypto.createHash('sha256').update(data).digest('hex')
      return Promise.resolve(hash)
    }
    return Promise.reject(new Error('Unsupported algorithm'))
  }),
}))

import { hashPhoneNumber, hashPhoneNumbers, truncateHashForLookup } from '../lib/contacts/hasher'
import crypto from 'crypto'

describe('Contact Hasher', () => {
  test('hashPhoneNumber generates valid, lowercase SHA-256 hash', async () => {
    const phone = '+919876543210'
    const hash = await hashPhoneNumber(phone)
    
    // Check length (SHA-256 hex is 64 characters)
    expect(hash).toHaveLength(64)
    // Check lowercase
    expect(hash).toBe(hash.toLowerCase())
    // Check actual SHA-256 value for +919876543210
    const expected = crypto.createHash('sha256').update(phone).digest('hex').toLowerCase()
    expect(hash).toBe(expected)
  })

  test('hashPhoneNumbers hashes multiple numbers in batch', async () => {
    const phones = ['+919876543210', '+919999999999']
    const hashes = await hashPhoneNumbers(phones)
    
    expect(hashes).toHaveLength(2)
    expect(hashes[0]).toBe(await hashPhoneNumber(phones[0]))
    expect(hashes[1]).toBe(await hashPhoneNumber(phones[1]))
  })

  test('truncateHashForLookup returns the first 16 characters of the hash', () => {
    const sampleHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const truncated = truncateHashForLookup(sampleHash)
    
    expect(truncated).toHaveLength(16)
    expect(truncated).toBe('e3b0c44298fc1c14')
  })
})

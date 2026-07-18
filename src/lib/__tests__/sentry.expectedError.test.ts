// src/lib/__tests__/sentry.expectedError.test.ts
import { isExpectedError } from '../errorClassification'

const withCode = (code: string) => Object.assign(new Error('x'), { code })

describe('isExpectedError', () => {
  it('flags Firestore/auth codes that are non-actionable', () => {
    expect(isExpectedError(withCode('permission-denied'))).toBe(true)
    expect(isExpectedError(withCode('unauthenticated'))).toBe(true)
    expect(isExpectedError(withCode('unavailable'))).toBe(true)
    expect(isExpectedError(withCode('auth/network-request-failed'))).toBe(true)
    expect(isExpectedError(withCode('functions/unauthenticated'))).toBe(true)
  })

  it('flags expected messages regardless of code', () => {
    expect(isExpectedError(new Error('Sign in required'))).toBe(true)
    expect(isExpectedError(new Error('Missing or insufficient permissions'))).toBe(true)
    expect(isExpectedError(new Error('Network request failed'))).toBe(true)
    expect(isExpectedError(new Error('Failed to get document because the client is offline'))).toBe(true)
  })

  it('does NOT flag genuine faults', () => {
    expect(isExpectedError(new Error('Cannot read property x of undefined'))).toBe(false)
    expect(isExpectedError(withCode('internal'))).toBe(false)
    expect(isExpectedError(new Error('Unexpected token in JSON'))).toBe(false)
  })

  it('handles null / undefined / non-error input safely', () => {
    expect(isExpectedError(null)).toBe(false)
    expect(isExpectedError(undefined)).toBe(false)
    expect(isExpectedError('Sign in required')).toBe(true)
    expect(isExpectedError(42)).toBe(false)
  })
})

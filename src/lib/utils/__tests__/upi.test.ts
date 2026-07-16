// src/lib/utils/__tests__/upi.test.ts

jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
}))

import { Linking } from 'react-native'
import { isValidUpiId, buildUpiPayUrl, openUpiPayment } from '../upi'

describe('isValidUpiId', () => {
  it('accepts standard VPAs', () => {
    expect(isValidUpiId('riya@okhdfcbank')).toBe(true)
    expect(isValidUpiId('9876543210@ybl')).toBe(true)
    expect(isValidUpiId('arjun.k-2@paytm')).toBe(true)
    expect(isValidUpiId('  riya@upi  ')).toBe(true) // trimmed
  })

  it('rejects malformed VPAs', () => {
    expect(isValidUpiId('')).toBe(false)
    expect(isValidUpiId('riya')).toBe(false)
    expect(isValidUpiId('@bank')).toBe(false)
    expect(isValidUpiId('riya@')).toBe(false)
    expect(isValidUpiId('riya@123')).toBe(false)   // PSP handle must be alphabetic
    expect(isValidUpiId('ri ya@upi')).toBe(false)  // no spaces
  })
})

describe('buildUpiPayUrl', () => {
  it('builds an NPCI-spec upi://pay url', () => {
    const url = buildUpiPayUrl({
      payeeVpa: 'riya@okhdfcbank',
      payeeName: 'Riya Sharma',
      amountRupees: 1250.5,
      note: 'apna settle up',
    })
    expect(url).toBe(
      'upi://pay?pa=riya%40okhdfcbank&pn=Riya%20Sharma&am=1250.50&cu=INR&tn=apna%20settle%20up',
    )
  })

  it('always formats amount to 2 decimals', () => {
    expect(buildUpiPayUrl({ payeeVpa: 'a@upi', payeeName: 'A', amountRupees: 100 })).toContain(
      'am=100.00',
    )
  })

  it('omits tn when no note', () => {
    expect(
      buildUpiPayUrl({ payeeVpa: 'a@upi', payeeName: 'A', amountRupees: 1 }),
    ).not.toContain('tn=')
  })

  it('encodes special characters safely', () => {
    const url = buildUpiPayUrl({
      payeeVpa: ' a@upi ',
      payeeName: 'R&D crew',
      amountRupees: 9.999,
      note: '50% share',
    })
    expect(url).toContain('pa=a%40upi')       // trimmed
    expect(url).toContain('pn=R%26D%20crew')
    expect(url).toContain('am=10.00')
    expect(url).toContain('tn=50%25%20share')
  })
})

describe('openUpiPayment', () => {
  it('opens the deeplink and reports success', async () => {
    ;(Linking.openURL as jest.Mock).mockResolvedValueOnce(true)
    const ok = await openUpiPayment({ payeeVpa: 'a@upi', payeeName: 'A', amountRupees: 10 })
    expect(ok).toBe(true)
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('upi://pay?pa=a%40upi'))
  })

  it('returns false when no UPI app can handle the intent', async () => {
    ;(Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('No activity'))
    const ok = await openUpiPayment({ payeeVpa: 'a@upi', payeeName: 'A', amountRupees: 10 })
    expect(ok).toBe(false)
  })
})

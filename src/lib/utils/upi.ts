// src/lib/utils/upi.ts
// UPI deeplink helpers — opens GPay/PhonePe/Paytm/any UPI app with
// a pre-filled payment via the standard upi://pay intent (NPCI spec).
// apna never moves money itself; the user completes payment in their UPI app.

import { Linking } from 'react-native'

// VPA format: handle@psp (e.g. riya@okhdfcbank, 9876543210@ybl)
const UPI_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,48}@[a-zA-Z]{2,49}$/

export function isValidUpiId(upiId: string): boolean {
  return UPI_ID_REGEX.test(upiId.trim())
}

export function buildUpiPayUrl(params: {
  payeeVpa: string      // receiver's UPI ID
  payeeName: string     // receiver's display name
  amountRupees: number  // pre-filled amount
  note?: string         // transaction note shown in the UPI app
}): string {
  const { payeeVpa, payeeName, amountRupees, note } = params
  const query = [
    `pa=${encodeURIComponent(payeeVpa.trim())}`,
    `pn=${encodeURIComponent(payeeName.slice(0, 50))}`,
    `am=${amountRupees.toFixed(2)}`,
    'cu=INR',
    ...(note ? [`tn=${encodeURIComponent(note.slice(0, 80))}`] : []),
  ].join('&')
  return `upi://pay?${query}`
}

/**
 * Opens the user's UPI app with the payment pre-filled.
 * Returns false when no UPI app is installed.
 */
export async function openUpiPayment(params: {
  payeeVpa: string
  payeeName: string
  amountRupees: number
  note?: string
}): Promise<boolean> {
  const url = buildUpiPayUrl(params)
  try {
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}

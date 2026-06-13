import * as Crypto from 'expo-crypto'

export async function hashPhoneNumber(phone: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    phone
  )
  return hash.toLowerCase()
}

export async function hashPhoneNumbers(phones: string[]): Promise<string[]> {
  return Promise.all(phones.map((p) => hashPhoneNumber(p)))
}

export function truncateHashForLookup(hash: string): string {
  return hash.substring(0, 16)
}

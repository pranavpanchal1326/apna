import { createMMKV } from 'react-native-mmkv'

export interface ContactMatchCache {
  hashedPhones: string[]
  matchedUsers: MatchedUser[]
  cachedAt: number
  permissionGrantedAt: number
}

export interface MatchedUser {
  uid: string
  name: string
  phone: string          // masked: +91XXXXX12345
  avatarColor: string
  isAlreadyMember: boolean
}

const contactsStorage = createMMKV({ id: 'apna-contacts-cache' })
const CACHE_KEY = 'contact_match_cache'

export function maskPhoneNumber(phone: string): string {
  const last5 = phone.slice(-5)
  return `+91XXXXX${last5}`
}

export const contactCache = {
  set(data: ContactMatchCache): void {
    contactsStorage.set(CACHE_KEY, JSON.stringify(data))
  },
  
  get(): ContactMatchCache | null {
    const raw = contactsStorage.getString(CACHE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ContactMatchCache
    } catch {
      return null
    }
  },
  
  isValid(): boolean {
    const cache = this.get()
    if (!cache) return false
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return now - cache.cachedAt < fiveMinutes
  },
  
  clear(): void {
    contactsStorage.remove(CACHE_KEY)
  },
}

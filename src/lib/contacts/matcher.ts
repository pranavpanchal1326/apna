import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'
import { getContactsPermissionStatus } from './permissions'
import { readNormalisedContacts } from './reader'
import { hashPhoneNumbers, truncateHashForLookup } from './hasher'
import { contactCache, type MatchedUser } from './cache'
import { captureError } from '../sentry'

export interface ContactMatchResult {
  matches: MatchedUser[]
  totalContactsScanned: number
  fromCache: boolean
}

export class ContactsPermissionDeniedError extends Error {
  constructor() {
    super('Contacts permission denied')
    this.name = 'ContactsPermissionDeniedError'
  }
}

interface MatchContactsRequest {
  truncatedHashes: string[]
  groupId: string
}

interface MatchContactsResponse {
  matches: Array<{
    uid: string
    name: string
    maskedPhone: string
    avatarColor: string
    isAlreadyMember: boolean
  }>
}

export async function matchContacts(params: {
  groupId: string
  existingMemberIds: string[]
  currentUserId: string
  forceRefresh?: boolean
}): Promise<ContactMatchResult> {
  const { groupId, existingMemberIds, currentUserId, forceRefresh = false } = params

  // 1. Check permissions first
  const permission = await getContactsPermissionStatus()
  if (permission !== 'granted') {
    throw new ContactsPermissionDeniedError()
  }

  // 2. Return cache if valid
  if (!forceRefresh && contactCache.isValid()) {
    const cached = contactCache.get()
    if (cached) {
      const updatedMatches = cached.matchedUsers.map((u) => ({
        ...u,
        isAlreadyMember: existingMemberIds.includes(u.uid),
      }))

      // Sort: non-members first, then already-members
      updatedMatches.sort((a, b) => {
        if (a.isAlreadyMember === b.isAlreadyMember) return 0
        return a.isAlreadyMember ? 1 : -1
      })

      return {
        matches: updatedMatches,
        totalContactsScanned: cached.hashedPhones.length,
        fromCache: true,
      }
    }
  }

  try {
    // 3. Read & normalise contacts from device
    const contacts = await readNormalisedContacts()
    
    // Extract unique phone numbers
    const uniquePhones = Array.from(
      new Set(contacts.flatMap((c) => c.phoneNumbers))
    )

    if (uniquePhones.length === 0) {
      return {
        matches: [],
        totalContactsScanned: 0,
        fromCache: false,
      }
    }

    // 4. Hash phone numbers and truncate
    const hashedPhones = await hashPhoneNumbers(uniquePhones)
    const truncatedHashes = hashedPhones.map(truncateHashForLookup)

    // 5. Call Cloud Function
    const matchContactsFn = httpsCallable<MatchContactsRequest, MatchContactsResponse>(
      functions,
      'matchContactsByHash'
    )
    const response = await matchContactsFn({ truncatedHashes, groupId })

    // 6. Map matches and determine isAlreadyMember
    const matches: MatchedUser[] = (response.data.matches || []).map((m) => ({
      uid: m.uid,
      name: m.name,
      phone: m.maskedPhone,
      avatarColor: m.avatarColor,
      isAlreadyMember: existingMemberIds.includes(m.uid),
    }))

    // 7. Filter out current user
    const filteredMatches = matches.filter((m) => m.uid !== currentUserId)

    // 8. Sort: non-members first
    filteredMatches.sort((a, b) => {
      if (a.isAlreadyMember === b.isAlreadyMember) return 0
      return a.isAlreadyMember ? 1 : -1
    })

    // 9. Cache matches
    contactCache.set({
      hashedPhones,
      matchedUsers: filteredMatches,
      cachedAt: Date.now(),
      permissionGrantedAt: Date.now(),
    })

    return {
      matches: filteredMatches,
      totalContactsScanned: uniquePhones.length,
      fromCache: false,
    }
  } catch (err) {
    // Log failure to Sentry and return empty list
    captureError(err, { source: 'matchContacts', groupId })
    return {
      matches: [],
      totalContactsScanned: 0,
      fromCache: false,
    }
  }
}

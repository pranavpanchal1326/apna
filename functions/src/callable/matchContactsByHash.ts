import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'

interface MatchContactsRequest {
  truncatedHashes: string[]   // array of 16-char hex strings
  groupId: string             // to determine isAlreadyMember
}

interface MatchContactsResponse {
  matches: Array<{
    uid: string
    name: string
    maskedPhone: string      // +91XXXXX12345
    avatarColor: string
    isAlreadyMember: boolean
  }>
}

export const matchContactsByHash = onCall<MatchContactsRequest, Promise<MatchContactsResponse>>(
  { region: 'asia-south1' },
  async (request) => {
    // 1. Authenticate
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required')
    }
    const uid = request.auth.uid

    // 2. Validate request payload
    const { truncatedHashes, groupId } = request.data
    if (!Array.isArray(truncatedHashes) || truncatedHashes.length < 1 || truncatedHashes.length > 500) {
      throw new HttpsError('invalid-argument', 'truncatedHashes must be an array of length 1 to 500.')
    }
    if (typeof groupId !== 'string' || !groupId) {
      throw new HttpsError('invalid-argument', 'groupId is required.')
    }

    // 3. Filter valid 16-character lowercase hex hashes
    const validHashes = truncatedHashes.filter(
      (hash) => typeof hash === 'string' && /^[0-9a-f]{16}$/.test(hash)
    )
    if (validHashes.length === 0) {
      return { matches: [] }
    }

    // 4. Rate limit: max 3 calls per user per minute using simple Firestore counter
    const db = getFirestore()
    const now = Date.now()
    const rateLimitRef = db.doc(`rate_limits/${uid}`)

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(rateLimitRef)
        const data = snap.data() || { count: 0, resetTime: now + 60000 }

        if (now > data.resetTime) {
          // Reset window
          transaction.set(rateLimitRef, { count: 1, resetTime: now + 60000 })
        } else {
          if (data.count >= 3) {
            throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Max 3 calls per minute.')
          }
          transaction.set(rateLimitRef, { count: data.count + 1, resetTime: data.resetTime })
        }
      })
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      console.error('[matchContactsByHash] Rate limit transaction failed:', error)
      throw new HttpsError('internal', 'Internal rate limiting error')
    }

    // 5. Query group members
    const groupRef = db.collection('groups').doc(groupId)
    const groupSnap = await groupRef.get()
    if (!groupSnap.exists) {
      throw new HttpsError('not-found', 'Group not found')
    }
    const groupData = groupSnap.data()
    const memberIds = new Set<string>(groupData?.memberIds || [])

    // 6. Query users matching truncated hashes in batches of 30
    const usersCol = db.collection('users')
    const batches: string[][] = []
    for (let i = 0; i < validHashes.length; i += 30) {
      batches.push(validHashes.slice(i, i + 30))
    }

    const queryPromises = batches.map((batch) =>
      usersCol.where('phoneHash', 'in', batch).get()
    )
    const snapshots = await Promise.all(queryPromises)

    const matches: MatchContactsResponse['matches'] = []

    for (const snap of snapshots) {
      snap.forEach((docSnap) => {
        const userUid = docSnap.id
        if (userUid === uid) return // Never return the caller's own profile

        const data = docSnap.data()
        const rawPhone = data.phone || ''
        const last5 = rawPhone.slice(-5)
        const maskedPhone = `+91XXXXX${last5}`

        matches.push({
          uid: userUid,
          name: data.name || 'Unnamed',
          maskedPhone,
          avatarColor: data.avatarColor || '#4ECDC4',
          isAlreadyMember: memberIds.has(userUid),
        })
      })
    }

    return { matches }
  }
)

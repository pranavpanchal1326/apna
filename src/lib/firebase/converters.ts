// src/lib/firebase/converters.ts
// Firestore typed converters — eliminates manual casting throughout the app.
// Usage: collection(db, 'groups').withConverter(groupConverter)
//
// Pattern: toFirestore strips the client-only 'id'/'uid' field.
//          fromFirestore injects doc.id as the 'id'/'uid' field.

import type {
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
} from 'firebase/firestore'
import type {
  UserInput,
  GroupInput,
  ExpenseInput,
  ItineraryItem,
  MemoryInput,
  ActivityItem,
  ReferralLink,
  ReferralAttribution,
  PublicRecap,
} from '@lib/schemas'

export const userConverter: FirestoreDataConverter<UserInput> = {
  toFirestore(data: UserInput) {
    // Strip 'uid' — Firestore uses doc.id, not a field
    const { uid, ...rest } = data
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): UserInput {
    return { uid: snap.id, ...snap.data(options) } as UserInput
  },
}

function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      // Strip 'id' — Firestore uses doc.id, not a field
      const { id, ...rest } = data
      return rest as any
    },
    fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      return { id: snap.id, ...snap.data(options) } as T
    },
  }
}

export const groupConverter     = makeConverter<GroupInput>()
export const expenseConverter   = makeConverter<ExpenseInput>()
export const itineraryConverter = makeConverter<ItineraryItem>()
export const memoryConverter    = makeConverter<MemoryInput>()
export const activityConverter  = makeConverter<ActivityItem>()
export const referralLinkConverter = makeConverter<ReferralLink>()
export const referralAttributionConverter = makeConverter<ReferralAttribution>()
export const publicRecapConverter = makeConverter<PublicRecap>()


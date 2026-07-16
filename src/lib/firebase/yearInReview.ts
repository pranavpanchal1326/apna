// src/lib/firebase/yearInReview.ts
// Read-only client for the server-generated Year in Review doc (PRD §17).
// Written by the generateYearInReview scheduled function every December.

import { doc, getDoc } from 'firebase/firestore'
import { db } from './config'
import { captureError } from '@lib/sentry'

export interface YearInReview {
  year: number
  groupId: string
  groupName: string
  coverEmoji?: string
  currency: string
  totalSpend: number
  expenseCount: number
  topCategory: string | null
  memoriesCount: number
  topPhotoUrls: string[]
  memberCount: number
}

export async function fetchYearInReview(
  groupId: string,
  year: number,
): Promise<YearInReview | null> {
  try {
    const snap = await getDoc(doc(db, 'groups', groupId, 'yearInReview', String(year)))
    if (!snap.exists()) return null
    return snap.data() as YearInReview
  } catch (err) {
    captureError(err, { source: 'fetchYearInReview', groupId })
    return null
  }
}

// src/lib/firebase/memories.ts
import { getDocs, query, orderBy } from 'firebase/firestore'
import { memoriesCol } from './collections'
import type { MemoryInput } from '../schemas'

/**
 * Fetches all memories for a group, ordered chronologically.
 */
export async function fetchMemories(groupId: string): Promise<MemoryInput[]> {
  try {
    const q = query(memoriesCol(groupId), orderBy('date', 'asc'), orderBy('createdAt', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }))
  } catch (err) {
    console.error(`[Firebase] Error fetching memories for group: ${groupId}`, err)
    throw err
  }
}

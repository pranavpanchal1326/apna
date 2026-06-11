// src/lib/firebase/memories.ts
// Firestore operations for Memories & Reactions.

import {
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  doc,
  onSnapshot,
  deleteField,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { nanoid } from 'nanoid/non-secure'
import { memoriesCol, memoryDoc } from './collections'
import type { MemoryInput, MemoryCreate } from '../schemas'
import type { ReactionEmoji } from '../types'

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

/**
 * Real-time subscription to group memories.
 */
export function subscribeToMemories(
  groupId: string,
  onUpdate: (memories: MemoryInput[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(memoriesCol(groupId), orderBy('date', 'asc'), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const memories = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      }))
      onUpdate(memories)
    },
    (err) => {
      console.error(`[Firebase] error subscribing to memories for group ${groupId}:`, err)
      onError?.(err)
    }
  )
}

/**
 * Adds a new memory to group storage and firestore.
 */
export async function addMemory(
  groupId: string,
  input: MemoryCreate
): Promise<string> {
  const id = nanoid()
  const ref = doc(memoriesCol(groupId), id)
  
  await setDoc(ref, {
    ...input,
    id,
    groupId,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  
  return id
}

/**
 * Casts an emoji reaction on a memory.
 * Replaces any existing reaction from this user.
 */
export async function castMemoryReaction(
  groupId: string,
  memoryId: string,
  userId: string,
  emoji: ReactionEmoji
): Promise<void> {
  const ref = memoryDoc(groupId, memoryId)
  await updateDoc(ref, {
    [`reactions.${userId}`]: emoji,
  })
}

/**
 * Removes an emoji reaction from a memory.
 */
export async function removeMemoryReaction(
  groupId: string,
  memoryId: string,
  userId: string
): Promise<void> {
  const ref = memoryDoc(groupId, memoryId)
  await updateDoc(ref, {
    [`reactions.${userId}`]: deleteField(),
  })
}

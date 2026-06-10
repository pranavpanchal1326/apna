import { create } from 'zustand'
import type { VoteValue } from '../lib/types'

interface VotingState {
  optimisticVotes: Record<string, Record<string, VoteValue>>
  pendingVotes: Record<string, boolean>
  setOptimisticVote: (itemId: string, userId: string, vote: VoteValue) => void
  clearOptimisticVote: (itemId: string, userId: string) => void
  setPending: (itemId: string, pending: boolean) => void
}

export const useVotingStore = create<VotingState>((set) => ({
  optimisticVotes: {},
  pendingVotes: {},
  setOptimisticVote: (itemId, userId, vote) => set((state) => ({
    optimisticVotes: {
      ...state.optimisticVotes,
      [itemId]: {
        ...(state.optimisticVotes[itemId] ?? {}),
        [userId]: vote,
      },
    },
  })),
  clearOptimisticVote: (itemId, userId) => set((state) => {
    const itemVotes = { ...(state.optimisticVotes[itemId] ?? {}) }
    delete itemVotes[userId]
    return {
      optimisticVotes: {
        ...state.optimisticVotes,
        [itemId]: itemVotes,
      },
    }
  }),
  setPending: (itemId, pending) => set((state) => ({
    pendingVotes: {
      ...state.pendingVotes,
      [itemId]: pending,
    },
  })),
}))

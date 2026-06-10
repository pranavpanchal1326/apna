import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase/config'
import { useAuth } from './useAuth'
import { useGroupStore } from '../stores/group.store'
import { useItineraryStore } from '../stores/itinerary.store'
import { useVotingStore } from '../stores/voting.store'
import type { VoteValue, VoteSummary } from '../lib/types'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'

export function useActivityVoting(itemId: string) {
  const { user } = useAuth()
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const itemsByDay = useItineraryStore((s) => s.itemsByDay)
  
  const optimisticVotes = useVotingStore((s) => s.optimisticVotes[itemId] ?? {})
  const setOptimisticVote = useVotingStore((s) => s.setOptimisticVote)
  const clearOptimisticVote = useVotingStore((s) => s.clearOptimisticVote)
  const setPending = useVotingStore((s) => s.setPending)

  // Find dayId for the item by searching the itinerary store
  const dayId = Object.keys(itemsByDay).find((dId) =>
    itemsByDay[dId].some((item) => item.id === itemId)
  )

  const rawItem = dayId
    ? itemsByDay[dayId].find((item) => item.id === itemId)
    : undefined

  const myUid = user?.uid ?? ''
  const groupId = activeGroup?.id ?? ''
  const totalEligibleVoters = activeGroup?.memberIds?.length ?? 1

  // Compute live vote summary combining database state and local optimistic votes
  const getVoteSummary = (): VoteSummary => {
    const votes = { ...rawItem?.votes, ...optimisticVotes } as Record<string, VoteValue>
    let yesCount = 0
    let maybeCount = 0
    let noCount = 0

    Object.keys(votes).forEach((uid) => {
      // Ignore legacy votes up/down keys if present
      if (uid === 'up' || uid === 'down') return
      const v = votes[uid]
      if (v === 'yes') yesCount++
      else if (v === 'maybe') maybeCount++
      else if (v === 'no') noCount++
    })

    return {
      yesCount,
      maybeCount,
      noCount,
      totalEligibleVoters,
      state: rawItem?.proposalMeta?.state ?? 'open',
    }
  }

  const voteOnProposal = async (vote: VoteValue) => {
    if (!myUid || !groupId || !dayId) return
    
    ReactNativeHapticFeedback.trigger('impactLight')
    setOptimisticVote(itemId, myUid, vote)
    setPending(itemId, true)

    try {
      const itemRef = doc(db, 'groups', groupId, 'days', dayId, 'items', itemId)
      await updateDoc(itemRef, {
        [`votes.${myUid}`]: vote,
      })
    } catch (err) {
      clearOptimisticVote(itemId, myUid)
      console.error('[useActivityVoting] Failed to save vote:', err)
    } finally {
      setPending(itemId, false)
    }
  }

  const summary = getVoteSummary()

  return {
    voteOnProposal,
    summary,
    myVote: (optimisticVotes[myUid] ?? rawItem?.votes?.[myUid] ?? null) as VoteValue | null,
    isConfirmed: summary.state === 'confirmed',
    isOpen: summary.state === 'open',
    isRejected: summary.state === 'rejected',
  }
}

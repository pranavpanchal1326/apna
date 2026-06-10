import type { Timestamp } from 'firebase/firestore'
import type { VoteValue } from './itinerary.types'

export type ProposalState = 'open' | 'confirmed' | 'rejected'

export interface ActivityProposalMeta {
  proposalId: string
  proposedBy: string
  proposedAt: Timestamp
  state: ProposalState
  yesCount: number
  maybeCount: number
  noCount: number
  confirmedAt?: Timestamp
  confirmedBy?: string
}

export interface VoteSummary {
  yesCount: number
  maybeCount: number
  noCount: number
  totalEligibleVoters: number
  state: ProposalState
}

export interface VoteActionPayload {
  itemId: string
  userId: string
  vote: VoteValue
}

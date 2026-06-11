// functions/src/triggers/onItineraryWrite.ts
// Cloud Function (v2 Firestore Trigger, region: asia-south1):
// Writes activity feed entries when itinerary items are created.
// Maintains DayPlan.itemCount + totalEstimatedCost via atomic increments.

import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import type { ItineraryItem } from '../../../src/lib/schemas/itinerary.schema'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'

const db = admin.firestore()

// ── onCreate: item added ─────────────────────────────────────────────
export const onItineraryItemCreated = onDocumentCreated(
  { document: 'groups/{groupId}/days/{dayId}/items/{itemId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, dayId, itemId } = event.params
    const item = event.data?.data() as ItineraryItem | undefined
    if (!item) return

    const batch = db.batch()

    // 1. Increment DayPlan itemCount + totalEstimatedCost
    const dayRef = db.doc(`groups/${groupId}/days/${dayId}`)
    batch.update(dayRef, {
      itemCount:          admin.firestore.FieldValue.increment(1),
      totalEstimatedCost: admin.firestore.FieldValue.increment(
        item.estimatedCost ?? 0
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Fetch day info for feed
    const daySnap = await dayRef.get()
    const dayNumber = daySnap.exists ? (daySnap.data()?.dayNumber ?? 1) : 1

    // Fetch actor name
    const actorSnap = await db.collection('users').doc(item.addedByUid).get()
    const actorName = actorSnap.exists ? (actorSnap.data()?.name?.split(' ')[0] ?? 'Someone') : 'Someone'

    let feedTitle = `${actorName} added ${item.title}`
    if (item.proposalMeta) {
      feedTitle = `${actorName} proposed ${item.title} for Day ${dayNumber}`
    }

    // 2. Write activity feed entry
    const activityRef = db
      .collection(`groups/${groupId}/activity`)
      .doc()
    batch.set(activityRef, {
      id:        activityRef.id,
      type:      'trip_event',
      actorUid:  item.addedByUid,
      groupId,
      metadata: {
        title:      feedTitle,
        category:   item.category,
        dayId,
        itemId,
        placeId:    item.placeRef?.placeId ?? null,
        placeName:  item.placeRef?.name    ?? null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await batch.commit()
  }
)

// ── onDelete: item removed ───────────────────────────────────────────
export const onItineraryItemDeleted = onDocumentDeleted(
  { document: 'groups/{groupId}/days/{dayId}/items/{itemId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, dayId } = event.params
    const item = event.data?.data() as ItineraryItem | undefined
    if (!item) return

    const dayRef = db.doc(`groups/${groupId}/days/${dayId}`)
    await dayRef.update({
      itemCount:          admin.firestore.FieldValue.increment(-1),
      totalEstimatedCost: admin.firestore.FieldValue.increment(
        -(item.estimatedCost ?? 0)
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
)

// ── onUpdate: item updated (voting and auto-confirmation) ────────────
export const onItineraryItemUpdated = onDocumentUpdated(
  { document: 'groups/{groupId}/days/{dayId}/items/{itemId}', region: 'asia-south1' },
  async (event) => {
    const { groupId, dayId, itemId } = event.params
    const beforeItem = event.data?.before.data() as ItineraryItem | undefined
    const afterItem = event.data?.after.data() as ItineraryItem | undefined
    if (!beforeItem || !afterItem) return

    const votesBefore = beforeItem.votes || {}
    const votesAfter = afterItem.votes || {}
    
    // Check if votes changed
    const votesChanged = JSON.stringify(votesBefore) !== JSON.stringify(votesAfter)
    
    if (votesChanged && afterItem.proposalMeta && afterItem.proposalMeta.state === 'open') {
      // 1. Calculate new counts
      let yesCount = 0
      let maybeCount = 0
      let noCount = 0
      
      Object.keys(votesAfter).forEach((uid) => {
        if (uid === 'up' || uid === 'down') return
        const val = votesAfter[uid]
        if (val === 'yes') yesCount++
        else if (val === 'maybe') maybeCount++
        else if (val === 'no') noCount++
      })
      
      // 2. Fetch group to get eligible voters count
      const groupSnap = await db.collection('groups').doc(groupId).get()
      if (!groupSnap.exists) return
      const groupData = groupSnap.data()
      const memberIds = (groupData?.memberIds ?? []) as string[]
      const totalVoters = memberIds.length
      const threshold = totalVoters / 2
      
      // Find the voter UID who cast the latest vote
      let voterUid = 'Someone'
      Object.keys(votesAfter).forEach((uid) => {
        if (votesBefore[uid] !== votesAfter[uid]) {
          voterUid = uid
        }
      })
      
      let newState: 'open' | 'confirmed' | 'rejected' = 'open'
      let isConfirmed = false
      
      if (yesCount > threshold) {
        newState = 'confirmed'
        isConfirmed = true
      } else if (noCount > threshold) {
        newState = 'rejected'
      }
      
      // Prevent infinite loop: only update if something changed in proposalMeta
      const countsChanged = 
        afterItem.proposalMeta.yesCount !== yesCount ||
        afterItem.proposalMeta.maybeCount !== maybeCount ||
        afterItem.proposalMeta.noCount !== noCount ||
        afterItem.proposalMeta.state !== newState

      if (countsChanged) {
        const proposalMeta = {
          ...afterItem.proposalMeta,
          yesCount,
          maybeCount,
          noCount,
          state: newState,
          ...(isConfirmed ? { confirmedAt: admin.firestore.FieldValue.serverTimestamp(), confirmedBy: voterUid } : {}),
        }
        
        const updatePayload: any = {
          proposalMeta,
          isConfirmed,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
        
        const itemRef = db.doc(`groups/${groupId}/days/${dayId}/items/${itemId}`)
        await itemRef.update(updatePayload)
        
        // 3. Write Feed Events and Notifications if state changed
        if (newState !== beforeItem.proposalMeta?.state) {
          const batch = db.batch()
          
          // Write Feed Event
          const activityRef = db.collection(`groups/${groupId}/activity`).doc()
          let activityTitle = ''
          if (newState === 'confirmed') {
            activityTitle = `${afterItem.title} is confirmed — ${yesCount} going`
          } else if (newState === 'rejected') {
            activityTitle = `${afterItem.title} proposal was rejected`
          }
          
          if (activityTitle) {
            batch.set(activityRef, {
              id: activityRef.id,
              type: 'trip_event',
              actorUid: voterUid,
              groupId,
              metadata: {
                title: activityTitle,
                itemId,
                dayId,
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
            await batch.commit()
          }
          
          // Push Notifications using sendPushToTokens
          const proposerUid = afterItem.proposalMeta.proposedBy
          const proposerSnap = await db.collection('users').doc(proposerUid).get()
          const proposerToken = proposerSnap.exists ? proposerSnap.data()?.fcmToken : null
          
          if (newState === 'confirmed') {
            // Notify proposer + optionally notify group
            const recipientTokens = await getGroupRecipientTokens(groupId, [voterUid])
            if (recipientTokens.length > 0) {
              await sendPushToTokens({
                tokens: recipientTokens,
                title: `${afterItem.title} is confirmed`,
                body: `The proposal passed with ${yesCount} votes!`,
                data: {
                  type: 'trip_event',
                  groupId,
                  groupName: groupData?.name ?? 'trip',
                },
              })
            }
          } else if (newState === 'rejected' && proposerToken) {
            // Notify proposer only
            await sendPushToTokens({
              tokens: [proposerToken],
              title: `Your proposal was rejected`,
              body: `"${afterItem.title}" did not get enough votes.`,
              data: {
                type: 'trip_event',
                groupId,
                groupName: groupData?.name ?? 'trip',
              },
            })
          }
        } else {
          // State did not change, but a vote was cast. Write feed event:
          // "Riya voted Yes on Sunday lunch."
          const voterSnap = await db.collection('users').doc(voterUid).get()
          const voterName = voterSnap.exists ? (voterSnap.data()?.name?.split(' ')[0] ?? 'Someone') : 'Someone'
          const voteVal = votesAfter[voterUid]
          const displayVote = voteVal === 'yes' ? 'Yes' : voteVal === 'maybe' ? 'Maybe' : 'No'
          
          const activityRef = db.collection(`groups/${groupId}/activity`).doc()
          await activityRef.set({
            id: activityRef.id,
            type: 'trip_event',
            actorUid: voterUid,
            groupId,
            metadata: {
              title: `${voterName} voted ${displayVote} on ${afterItem.title}`,
              itemId,
              dayId,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
      }
    }
  }
)

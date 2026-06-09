// functions/src/triggers/onGroupWriteNotify.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getGroupRecipientTokens, sendPushToTokens } from '../notifications/send'
import {
  buildMemberJoinedMessage,
  buildGroupCompletedMessage,
  buildInviteRegeneratedMessage,
  buildAdminTransferredMessage,
  buildMemberRemovedMessage,
} from '../notifications/templates'

const db = admin.firestore()

export const onGroupWriteNotify = onDocumentUpdated(
  {
    document: 'groups/{groupId}',
    region:   'asia-south1',
  },
  async (event) => {
    const { groupId } = event.params
    const beforeData = event.data?.before.data()
    const afterData = event.data?.after.data()

    if (!beforeData || !afterData) return

    try {
      const groupName = afterData.name ?? 'apna trip'
      const beforeMembers = (beforeData.memberIds ?? []) as string[]
      const afterMembers = (afterData.memberIds ?? []) as string[]
      const beforeAdmins = (beforeData.adminIds ?? []) as string[]
      const afterAdmins = (afterData.adminIds ?? []) as string[]

      // 1. Member joined
      if (afterMembers.length > beforeMembers.length) {
        const newUids = afterMembers.filter((uid) => !beforeMembers.includes(uid))
        if (newUids.length > 0) {
          const newUid = newUids[0]
          const userSnap = await db.collection('users').doc(newUid).get()
          const actorName = userSnap.data()?.name?.split(' ')[0] ?? 'Someone'

          const message = buildMemberJoinedMessage({
            groupId,
            groupName,
            actorName,
            actorUid: newUid,
          })

          const tokens = await getGroupRecipientTokens(groupId, [newUid])
          if (tokens.length > 0) {
            await sendPushToTokens({
              tokens,
              title: message.title,
              body: message.body,
              data: message.data,
            })
          }
        }
      }

      // 2. Member removed
      if (afterMembers.length < beforeMembers.length) {
        const removedUids = beforeMembers.filter((uid) => !afterMembers.includes(uid))
        if (removedUids.length > 0) {
          const removedUid = removedUids[0]
          const userSnap = await db.collection('users').doc(removedUid).get()
          const targetName = userSnap.data()?.name?.split(' ')[0] ?? 'Someone'

          const primaryAdminUid = afterData.creatorId || afterAdmins[0] || 'system'
          const adminSnap = await db.collection('users').doc(primaryAdminUid).get()
          const actorName = adminSnap.data()?.name?.split(' ')[0] ?? 'Admin'

          const message = buildMemberRemovedMessage({
            groupId,
            groupName,
            actorName,
            actorUid: primaryAdminUid,
            targetName,
            targetUid: removedUid,
          })

          const tokens = await getGroupRecipientTokens(groupId, [removedUid])
          if (tokens.length > 0) {
            await sendPushToTokens({
              tokens,
              title: message.title,
              body: message.body,
              data: message.data,
            })
          }
        }
      }

      // 3. Group completed
      if (beforeData.status !== 'completed' && afterData.status === 'completed') {
        const primaryAdminUid = afterData.creatorId || afterAdmins[0] || 'system'
        const adminSnap = await db.collection('users').doc(primaryAdminUid).get()
        const actorName = adminSnap.data()?.name?.split(' ')[0] ?? 'Admin'

        const message = buildGroupCompletedMessage({
          groupId,
          groupName,
          actorName,
          actorUid: primaryAdminUid,
        })

        const tokens = await getGroupRecipientTokens(groupId)
        if (tokens.length > 0) {
          await sendPushToTokens({
            tokens,
            title: message.title,
            body: message.body,
            data: message.data,
          })
        }
      }

      // 4. Invite code regenerated
      if (beforeData.inviteCode !== afterData.inviteCode) {
        const primaryAdminUid = afterData.creatorId || afterAdmins[0] || 'system'
        const adminSnap = await db.collection('users').doc(primaryAdminUid).get()
        const actorName = adminSnap.data()?.name?.split(' ')[0] ?? 'Admin'

        const message = buildInviteRegeneratedMessage({
          groupId,
          groupName,
          actorName,
          actorUid: primaryAdminUid,
        })

        const tokens = await getGroupRecipientTokens(groupId, [primaryAdminUid])
        if (tokens.length > 0) {
          await sendPushToTokens({
            tokens,
            title: message.title,
            body: message.body,
            data: message.data,
          })
        }
      }

      // 5. Admin transferred
      if (afterAdmins.length > beforeAdmins.length) {
        const newAdmins = afterAdmins.filter((uid) => !beforeAdmins.includes(uid))
        if (newAdmins.length > 0) {
          const newAdminUid = newAdmins[0]
          const userSnap = await db.collection('users').doc(newAdminUid).get()
          const targetName = userSnap.data()?.name?.split(' ')[0] ?? 'Someone'

          const primaryAdminUid = afterData.creatorId || afterAdmins[0] || 'system'
          const adminSnap = await db.collection('users').doc(primaryAdminUid).get()
          const actorName = adminSnap.data()?.name?.split(' ')[0] ?? 'Admin'

          const message = buildAdminTransferredMessage({
            groupId,
            groupName,
            actorName,
            actorUid: primaryAdminUid,
            targetName,
            targetUid: newAdminUid,
          })

          const tokens = await getGroupRecipientTokens(groupId, [primaryAdminUid])
          if (tokens.length > 0) {
            await sendPushToTokens({
              tokens,
              title: message.title,
              body: message.body,
              data: message.data,
            })
          }
        }
      }
    } catch (err) {
      console.error(`[Notify] Error in onGroupWriteNotify for group ${groupId}:`, err)
    }
  }
)

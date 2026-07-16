// functions/src/notifications/__tests__/templates.test.ts
// FCM payload contracts — data values must all be strings (FCM requirement),
// and deeplink routing depends on the exact `type` values.

import {
  buildExpenseAddedMessage,
  buildExpenseUpdatedMessage,
  buildSettlementMessage,
  buildMemberJoinedMessage,
  buildGroupCompletedMessage,
  buildInviteRegeneratedMessage,
  buildAdminTransferredMessage,
  buildMemberRemovedMessage,
} from '../templates'

const base = {
  groupId: 'g1',
  groupName: 'Goa Trip',
  actorName: 'Arjun',
  actorUid: 'u1',
}

describe('notification templates', () => {
  it('expense added: formats INR amount and carries routing data', () => {
    const msg = buildExpenseAddedMessage({
      ...base,
      expenseId: 'e1',
      title: 'Dinner',
      amount: 1234567.5,
    })
    expect(msg.title).toBe('Goa Trip')
    expect(msg.body).toContain('Arjun added "Dinner"')
    expect(msg.body).toContain('₹12,34,567.5') // Indian digit grouping
    expect(msg.data.type).toBe('expense_added')
    expect(msg.data.amount).toBe('1234567.5') // FCM data must be strings
  })

  it('expense updated uses expense_updated type', () => {
    const msg = buildExpenseUpdatedMessage({ ...base, expenseId: 'e1', title: 'Cab', amount: 300 })
    expect(msg.data.type).toBe('expense_updated')
    expect(msg.body).toContain('updated')
  })

  it('settlement message names both parties', () => {
    const msg = buildSettlementMessage({
      ...base,
      settlementId: 's1',
      amount: 500,
      withName: 'Riya',
      withUid: 'u2',
    })
    expect(msg.body).toBe('Arjun settled with Riya · ₹500')
    expect(msg.data).toMatchObject({ type: 'settlement_recorded', withUid: 'u2' })
  })

  it('every template returns all-string data values (FCM contract)', () => {
    const messages = [
      buildExpenseAddedMessage({ ...base, expenseId: 'e', title: 't', amount: 1 }),
      buildExpenseUpdatedMessage({ ...base, expenseId: 'e', title: 't', amount: 1 }),
      buildSettlementMessage({ ...base, settlementId: 's', amount: 1, withName: 'R', withUid: 'u2' }),
      buildMemberJoinedMessage(base),
      buildGroupCompletedMessage(base),
      buildInviteRegeneratedMessage(base),
      buildAdminTransferredMessage({ ...base, targetName: 'R', targetUid: 'u2' }),
      buildMemberRemovedMessage({ ...base, targetName: 'R', targetUid: 'u2' }),
    ]
    for (const msg of messages) {
      expect(typeof msg.title).toBe('string')
      expect(typeof msg.body).toBe('string')
      Object.values(msg.data).forEach((v) => expect(typeof v).toBe('string'))
    }
  })

  it('member events carry targetUid for routing', () => {
    expect(
      buildAdminTransferredMessage({ ...base, targetName: 'Riya', targetUid: 'u2' }).data.targetUid,
    ).toBe('u2')
    expect(
      buildMemberRemovedMessage({ ...base, targetName: 'Riya', targetUid: 'u2' }).data.targetUid,
    ).toBe('u2')
  })
})

// src/tests/notificationRouter.test.ts
import { notificationToDeepLink } from '../navigation/deeplink/notificationRouter'

describe('Notification to Deep Link Router', () => {
  test('maps expense notifications correctly', () => {
    const payload = {
      type: 'expense_added',
      groupId: 'g1',
      expenseId: 'e1'
    }
    expect(notificationToDeepLink(payload)).toBe('apna://group/g1/expense/e1?source=notification')
  })

  test('maps settlement notifications correctly', () => {
    const payload = {
      type: 'settlement_recorded',
      groupId: 'g1'
    }
    expect(notificationToDeepLink(payload)).toBe('apna://group/g1?source=notification')
  })

  test('maps admin transferred and member removed notifications correctly', () => {
    const payloadSettings = {
      type: 'admin_transferred',
      groupId: 'g1'
    }
    expect(notificationToDeepLink(payloadSettings)).toBe('apna://group/g1/settings?source=notification')

    const payloadMembers = {
      type: 'member_removed',
      groupId: 'g1'
    }
    expect(notificationToDeepLink(payloadMembers)).toBe('apna://group/g1/members?source=notification')
  })

  test('maps on-this-day and memory reaction notifications correctly', () => {
    const payloadOTD = {
      type: 'on_this_day',
      groupId: 'g1'
    }
    expect(notificationToDeepLink(payloadOTD)).toBe('apna://memories/g1/on-this-day?source=notification')

    const payloadReaction = {
      type: 'memory_reaction',
      groupId: 'g1',
      memoryId: 'm1'
    }
    expect(notificationToDeepLink(payloadReaction)).toBe('apna://memories/g1/detail/m1?source=notification')
  })

  test('handles missing essential payload properties by returning home scheme', () => {
    expect(notificationToDeepLink(null as any)).toBe('apna://')
    expect(notificationToDeepLink({ type: 'on_this_day' })).toBe('apna://')
    expect(notificationToDeepLink({ groupId: 'g1' } as any)).toBe('apna://')
  })
})

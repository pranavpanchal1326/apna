import { shouldSendNotification, isSilentHours, batchNotifications } from '@/lib/notifications/rules'

describe('Notification Rules', () => {
  test('SOS bypasses all rules including silent hours', () => {
    // 2am — silent hours — SOS must still send
    const result = shouldSendNotification({ type: 'sos', hour: 2, recentCount: 100 })
    expect(result).toBe(true)
  })

  test('silent hours 11pm–8am blocks regular notifications', () => {
    expect(isSilentHours(23)).toBe(true)  // 11pm
    expect(isSilentHours(0)).toBe(true)   // midnight
    expect(isSilentHours(7)).toBe(true)   // 7am
    expect(isSilentHours(8)).toBe(false)  // 8am — allowed
    expect(isSilentHours(22)).toBe(false) // 10pm — allowed
  })

  test('max 3 notifications per group per hour — 4th is batched', () => {
    const result = shouldSendNotification({ type: 'expense', hour: 14, recentCount: 3 })
    expect(result).toBe(false)  // 4th notification in the hour is suppressed
  })

  test('expense notifications are real-time (not batched)', () => {
    const result = shouldSendNotification({ type: 'expense', hour: 14, recentCount: 0 })
    expect(result).toBe(true)
  })

  test('memory notifications are batched — only 1 per burst', () => {
    const batch = batchNotifications([
      { type: 'memory', groupId: 'g1', payload: { count: 4 } },
      { type: 'memory', groupId: 'g1', payload: { count: 1 } },
    ])
    expect(batch.length).toBe(1)
  })
})

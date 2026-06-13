jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  cacheDirectory: 'file://cache/',
}))

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        sentryDsn: 'mock-dsn',
      },
    },
  },
}))

import { buildBalanceWidgetData, buildMapWidgetData } from '@/lib/widget/dataWriter'

describe('Balance Widget Data', () => {
  const base = { groupId: 'g1', groupName: 'Pune Squad', currency: 'INR', userId: 'u1' }

  test('positive balance → "You are owed" label', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: { u1: 1375 } })
    expect(result.balanceLabel).toBe('You are owed')
    expect(result.userBalance).toBe(1375)
  })

  test('negative balance → "You owe" label', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: { u1: -125 } })
    expect(result.balanceLabel).toBe('You owe')
    expect(result.userBalance).toBe(-125)
  })

  test('zero balance → "All settled" label', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: { u1: 0 } })
    expect(result.balanceLabel).toBe('All settled')
  })

  test('formattedBalance contains ₹ symbol', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: { u1: 1375 } })
    expect(result.formattedBalance).toContain('₹')
  })

  test('deepLinkUrl contains groupId', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: { u1: 1375 } })
    expect(result.deepLinkUrl).toContain('g1')
  })

  test('missing userId in netBalances → zero balance', async () => {
    const result = await buildBalanceWidgetData({ ...base, netBalances: {} })
    expect(result.userBalance).toBe(0)
    expect(result.balanceLabel).toBe('All settled')
  })
})

describe('Map Widget Data', () => {
  const now = Date.now()
  const base = {
    groupId: 'g1',
    groupName: 'Pune Squad',
    memberProfiles: {
      u1: { name: 'Pranav Sharma', avatarColor: '#4ECDC4' },
      u2: { name: 'Riya', avatarColor: '#FF6B6B' },
      u3: { name: 'Arjun', avatarColor: '#FFD166' },
      u4: { name: 'Sneha', avatarColor: '#4ECDC4' },
    }
  }

  test('isLive true when timestamp < 60s ago', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: { u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 30000, sharing: true } }
    })
    expect(result.members[0].isLive).toBe(true)
  })

  test('isLive false when timestamp > 60s ago', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: { u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 90000, sharing: true } }
    })
    expect(result.members[0].isLive).toBe(false)
  })

  test('isLive false when sharing is false', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: { u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: false } }
    })
    expect(result.members[0].isLive).toBe(false)
  })

  test('max 3 members returned', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: {
        u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: true },
        u2: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 20000, sharing: true },
        u3: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 30000, sharing: true },
        u4: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 40000, sharing: true },
      }
    })
    expect(result.members.length).toBeLessThanOrEqual(3)
  })

  test('members sorted by most recent timestamp first', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: {
        u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 50000, sharing: true },
        u2: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: true },
      }
    })
    expect(result.members[0].name).toBe('Riya')
  })

  test('initials max 2 characters', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: { u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now, sharing: true } }
    })
    result.members.forEach(m => expect(m.initials.length).toBeLessThanOrEqual(2))
  })

  test('liveCount is correct', async () => {
    const result = await buildMapWidgetData({
      ...base,
      memberLocations: {
        u1: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: true },
        u2: { lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: false },
      }
    })
    expect(result.liveCount).toBe(1)
  })
})

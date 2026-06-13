import type { MemberLocation } from '../lib/types/location.types'
import type { WidgetBalanceData, WidgetMapData, WidgetMember } from '../lib/widget/types'

// Helper functions that duplicate the pure mapping logic used in useWidgetSync / widgets
function buildWidgetBalance(balanceRupees: number): WidgetBalanceData['label'] {
  return balanceRupees > 0
    ? 'You are owed'
    : balanceRupees < 0
      ? 'You owe'
      : 'All settled'
}

function formatINR(amount: number): string {
  const abs = Math.abs(amount)
  // Format as Indian Rupee style: e.g. 1,500.00 or 15,000.00
  return '₹' + abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getLiveStatus(timestampMs: number): boolean {
  const now = Date.now()
  return now - timestampMs < 60000 // 60 seconds threshold
}

function buildWidgetMapData(locations: MemberLocation[]): WidgetMember[] {
  // Sort by most recent timestamp
  const sorted = [...locations].sort((a, b) => b.timestamp - a.timestamp)
  
  // Truncate to max 3
  return sorted.slice(0, 3).map((loc) => ({
    uid: loc.userId,
    name: loc.name,
    avatarColor: loc.avatarColor,
    isLive: getLiveStatus(loc.timestamp),
  }))
}

describe('Widget Data Builder', () => {
  test('positive balance produces "You are owed" label', () => {
    expect(buildWidgetBalance(1375)).toBe('You are owed')
  })

  test('negative balance produces "You owe" label', () => {
    expect(buildWidgetBalance(-125)).toBe('You owe')
  })

  test('zero balance produces "All settled" label', () => {
    expect(buildWidgetBalance(0)).toBe('All settled')
  })

  test('formattedBalance is correct INR format', () => {
    expect(formatINR(1375)).toBe('₹1,375.00')
    expect(formatINR(-125)).toBe('₹125.00')
    expect(formatINR(0)).toBe('₹0.00')
  })

  test('map widget truncates to max 3 members', () => {
    const locations: MemberLocation[] = [
      { userId: 'u1', name: 'Pranav', avatarColor: '#4ECDC4', lat: 12, lng: 77, accuracy: 10, timestamp: Date.now(), sharing: true, status: 'live' },
      { userId: 'u2', name: 'Riya', avatarColor: '#FF6B6B', lat: 12, lng: 77, accuracy: 10, timestamp: Date.now(), sharing: true, status: 'live' },
      { userId: 'u3', name: 'Arjun', avatarColor: '#FFD166', lat: 12, lng: 77, accuracy: 10, timestamp: Date.now(), sharing: true, status: 'live' },
      { userId: 'u4', name: 'Sneha', avatarColor: '#A8E6CF', lat: 12, lng: 77, accuracy: 10, timestamp: Date.now(), sharing: true, status: 'live' },
    ]
    const preview = buildWidgetMapData(locations)
    expect(preview).toHaveLength(3)
  })

  test('isLive false for member with timestamp > 60 seconds ago', () => {
    const oldTimestamp = Date.now() - 65 * 1000 // 65 seconds ago
    expect(getLiveStatus(oldTimestamp)).toBe(false)
  })

  test('isLive true for member with timestamp < 60 seconds ago', () => {
    const freshTimestamp = Date.now() - 30 * 1000 // 30 seconds ago
    expect(getLiveStatus(freshTimestamp)).toBe(true)
  })

  test('members sorted by most recent timestamp', () => {
    const now = Date.now()
    const locations: MemberLocation[] = [
      { userId: 'u1', name: 'Pranav', avatarColor: '#4ECDC4', lat: 12, lng: 77, accuracy: 10, timestamp: now - 30000, sharing: true, status: 'live' }, // 30s ago
      { userId: 'u2', name: 'Riya', avatarColor: '#FF6B6B', lat: 12, lng: 77, accuracy: 10, timestamp: now, sharing: true, status: 'live' },       // now (most recent)
      { userId: 'u3', name: 'Arjun', avatarColor: '#FFD166', lat: 12, lng: 77, accuracy: 10, timestamp: now - 10000, sharing: true, status: 'live' }, // 10s ago
    ]
    const preview = buildWidgetMapData(locations)
    expect(preview[0].uid).toBe('u2') // Riya first
    expect(preview[1].uid).toBe('u3') // Arjun second
    expect(preview[2].uid).toBe('u1') // Pranav third
  })
})

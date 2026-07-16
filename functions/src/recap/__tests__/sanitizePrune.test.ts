// Regression tests: Firestore admin writes reject `undefined` values, so
// buildPublicRecapDoc must never emit them (crashed generateTripRecap for
// any group without coverEmoji — found via emulator E2E, 16 Jul 2026).

import { buildPublicRecapDoc, pruneUndefined } from '../sanitize'
import type { RecapSourceBundle } from '../recapBuilder'

const minimalBundle: RecapSourceBundle = {
  groupId: 'g1',
  groupName: 'Squad',
  // no destination, no coverEmoji, no dates — the crash case
  dateRangeLabel: 'No dates set',
  currency: 'INR',
  status: 'active',
  totalSpend: 0,
  tripDays: 2,
  memberCount: 3,
  memoriesCount: 1,
  placesVisitedCount: 0,
  topPhotoUrls: [],
}

describe('pruneUndefined', () => {
  it('drops undefined keys and keeps everything else (incl. falsy)', () => {
    expect(pruneUndefined({ a: 1, b: undefined, c: null, d: 0, e: '' })).toEqual({
      a: 1,
      c: null,
      d: 0,
      e: '',
    })
  })
})

describe('buildPublicRecapDoc', () => {
  it('emits no undefined values for a minimal group', () => {
    const doc = buildPublicRecapDoc({
      bundle: minimalBundle,
      shareSlug: 'squad-abc',
      createdBy: 'u1',
    })
    expect(doc).not.toBeNull()
    const undefinedKeys = Object.entries(doc!)
      .filter(([, v]) => v === undefined)
      .map(([k]) => k)
    expect(undefinedKeys).toEqual([])
  })

  it('still includes optional fields when present', () => {
    const doc = buildPublicRecapDoc({
      bundle: { ...minimalBundle, coverEmoji: '🏔️', destination: 'Jaipur', totalSpend: 900 },
      shareSlug: 'squad-abc',
      createdBy: 'u1',
      includeSpend: true,
    })
    expect(doc!.coverEmoji).toBe('🏔️')
    expect(doc!.destination).toBe('Jaipur')
    expect(doc!.totalSpend).toBe(900)
  })
})

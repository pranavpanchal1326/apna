// src/lib/utils/__tests__/hangout.test.ts
import {
  isQuorumReached,
  yesVotesNeeded,
  defaultQuorum,
  hangoutDisplayState,
  formatHangoutTime,
  myRsvp,
  rsvpUids,
  sortHangouts,
} from '../hangout'
import type { Hangout } from '../../schemas/hangout.schema'

const TODAY = new Date('2026-01-10T09:00:00').getTime()

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(TODAY)
})
afterAll(() => jest.useRealTimers())

const makeHangout = (over: Partial<Hangout> = {}): Hangout =>
  ({
    yesCount: 0,
    quorumThreshold: 3,
    status: 'proposed',
    scheduledDate: '2026-01-15',
    scheduledTime: '19:30',
    rsvps: {},
    ...over,
  }) as unknown as Hangout

describe('quorum helpers', () => {
  it('reports whether quorum is reached', () => {
    expect(isQuorumReached(makeHangout({ yesCount: 3 }))).toBe(true)
    expect(isQuorumReached(makeHangout({ yesCount: 2 }))).toBe(false)
  })

  it('reports remaining yes-votes needed, floored at zero', () => {
    expect(yesVotesNeeded(makeHangout({ yesCount: 1 }))).toBe(2)
    expect(yesVotesNeeded(makeHangout({ yesCount: 5 }))).toBe(0)
  })

  it('derives a default quorum of ceil(n/2), min 2', () => {
    expect(defaultQuorum(1)).toBe(2)
    expect(defaultQuorum(2)).toBe(2)
    expect(defaultQuorum(5)).toBe(3)
    expect(defaultQuorum(8)).toBe(4)
  })
})

describe('hangoutDisplayState', () => {
  it('is canceled when status is canceled', () => {
    expect(hangoutDisplayState(makeHangout({ status: 'canceled' }))).toBe('canceled')
  })

  it('is upcoming for a future proposed hangout', () => {
    expect(hangoutDisplayState(makeHangout({ scheduledDate: '2026-01-15' }))).toBe('upcoming')
  })

  it('is past for a proposed hangout whose date has passed', () => {
    expect(hangoutDisplayState(makeHangout({ scheduledDate: '2026-01-01' }))).toBe('past')
  })

  it('is confirmed for a future confirmed hangout', () => {
    expect(hangoutDisplayState(makeHangout({ status: 'confirmed', scheduledDate: '2026-01-15' }))).toBe('confirmed')
  })
})

describe('formatHangoutTime', () => {
  it('formats today with a 12-hour time', () => {
    expect(formatHangoutTime(makeHangout({ scheduledDate: '2026-01-10', scheduledTime: '19:30' }))).toBe('Today, 7:30 PM')
  })

  it('formats tomorrow and AM times', () => {
    expect(formatHangoutTime(makeHangout({ scheduledDate: '2026-01-11', scheduledTime: '09:00' }))).toBe('Tomorrow, 9:00 AM')
  })

  it('handles noon and midnight correctly', () => {
    expect(formatHangoutTime(makeHangout({ scheduledDate: '2026-01-10', scheduledTime: '12:00' }))).toBe('Today, 12:00 PM')
    expect(formatHangoutTime(makeHangout({ scheduledDate: '2026-01-10', scheduledTime: '00:00' }))).toBe('Today, 12:00 AM')
  })

  it('omits time when none is scheduled', () => {
    expect(formatHangoutTime(makeHangout({ scheduledDate: '2026-01-10', scheduledTime: undefined }))).toBe('Today')
  })
})

describe('rsvp helpers', () => {
  const h = makeHangout({
    rsvps: {
      a: { value: 'yes' },
      b: { value: 'no' },
      c: { value: 'yes' },
    },
  } as unknown as Partial<Hangout>)

  it('returns a user\'s rsvp value or null', () => {
    expect(myRsvp(h, 'a')).toBe('yes')
    expect(myRsvp(h, 'zzz')).toBeNull()
  })

  it('lists uids by rsvp value', () => {
    expect(rsvpUids(h, 'yes').sort()).toEqual(['a', 'c'])
    expect(rsvpUids(h, 'no')).toEqual(['b'])
  })
})

describe('sortHangouts', () => {
  it('orders confirmed before upcoming before past before canceled', () => {
    const confirmed = makeHangout({ status: 'confirmed', scheduledDate: '2026-01-15' })
    const upcoming = makeHangout({ scheduledDate: '2026-01-16' })
    const past = makeHangout({ scheduledDate: '2026-01-01' })
    const canceled = makeHangout({ status: 'canceled' })

    const sorted = [past, canceled, upcoming, confirmed].sort(sortHangouts)
    expect(sorted).toEqual([confirmed, upcoming, past, canceled])
  })
})

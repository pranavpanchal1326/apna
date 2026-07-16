// Unit tests for AI itinerary JSON parsing (Phase 7.4).

import { parseItineraryJson, buildItineraryPrompt } from '../itinerary'

const VALID = JSON.stringify([
  {
    day: 1,
    theme: 'Old City',
    items: [
      { title: 'Amber Fort', category: 'attraction', startTime: '09:00', note: 'Go early' },
      { title: 'Thali lunch', category: 'food', startTime: '13:00' },
    ],
  },
  {
    day: 2,
    theme: 'Markets',
    items: [{ title: 'Johari Bazaar', category: 'shopping' }],
  },
])

describe('parseItineraryJson', () => {
  it('parses a valid response', () => {
    const plans = parseItineraryJson(VALID, 2)
    expect(plans).toHaveLength(2)
    expect(plans![0].items[0]).toEqual({
      title: 'Amber Fort',
      category: 'attraction',
      startTime: '09:00',
      note: 'Go early',
    })
  })

  it('accepts a bare day object (small-model habit)', () => {
    const raw = '{"day":1,"theme":"Old City","items":[{"title":"Fort","category":"attraction"}]}'
    const plans = parseItineraryJson(raw, 2)
    expect(plans).toHaveLength(1)
    expect(plans![0].items[0].title).toBe('Fort')
  })

  it('accepts a newline-separated object sequence', () => {
    const raw =
      '{"day":1,"theme":"A","items":[{"title":"X","category":"food"}]}\n' +
      '{"day":2,"theme":"B","items":[{"title":"Y","category":"activity"}]}'
    const plans = parseItineraryJson(raw, 2)
    expect(plans).toHaveLength(2)
    expect(plans![1].theme).toBe('B')
  })

  it('rejects non-JSON and empty arrays', () => {
    expect(parseItineraryJson('sure! here is your itinerary…', 3)).toBeNull()
    expect(parseItineraryJson('[]', 3)).toBeNull()
    expect(parseItineraryJson('{"day":1}', 3)).toBeNull()
  })

  it('sanitizes bad categories, times and oversized text', () => {
    const raw = JSON.stringify([
      {
        day: 1,
        theme: 'T'.repeat(200),
        items: [
          { title: 'X'.repeat(200), category: 'nightlife', startTime: '9am', note: 'N'.repeat(200) },
        ],
      },
    ])
    const plans = parseItineraryJson(raw, 1)!
    expect(plans[0].theme).toHaveLength(60)
    expect(plans[0].items[0].title).toHaveLength(60)
    expect(plans[0].items[0].category).toBe('activity') // invalid → default
    expect(plans[0].items[0].startTime).toBeUndefined() // "9am" → dropped
    expect(plans[0].items[0].note).toHaveLength(90)
  })

  it('drops days with no usable items and caps at expectedDays', () => {
    const raw = JSON.stringify([
      { day: 1, theme: 'Empty', items: [{ category: 'food' }] }, // no titles
      { day: 2, theme: 'Good', items: [{ title: 'Beach', category: 'activity' }] },
      { day: 3, theme: 'Extra', items: [{ title: 'More', category: 'activity' }] },
    ])
    const plans = parseItineraryJson(raw, 2)!
    expect(plans).toHaveLength(1)
    expect(plans[0].theme).toBe('Good')
  })
})

describe('buildItineraryPrompt', () => {
  it('includes destination, day count and interests', () => {
    const prompt = buildItineraryPrompt('Jaipur', 3, ['history', 'food'])
    expect(prompt).toContain('3-day')
    expect(prompt).toContain('Jaipur')
    expect(prompt).toContain('history, food')
  })
})

// functions/src/ai/categorize.ts
// Phase 7.2 — Smart expense categorization.
// Rules-first (India-tuned keyword map, ~85% hit rate, zero cost);
// the AI gateway is consulted only when no rule matches.

export const EXPENSE_CATEGORIES = [
  'food',
  'stay',
  'transport',
  'activities',
  'shopping',
  'misc',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// Keyword → category. Word-boundary matched, case-insensitive.
// Tuned for Indian group-travel spending patterns.
const KEYWORD_RULES: Array<[ExpenseCategory, string[]]> = [
  [
    'food',
    [
      'zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'chai', 'tea', 'dhaba',
      'breakfast', 'lunch', 'dinner', 'brunch', 'snacks', 'pizza', 'burger',
      'biryani', 'dosa', 'thali', 'momos', 'juice', 'icecream', 'ice cream',
      'beer', 'drinks', 'bar', 'pub', 'liquor', 'wine', 'mcdonalds', 'kfc',
      'dominos', 'starbucks', 'food', 'meal', 'tiffin', 'mess', 'canteen',
      'bakery', 'sweets', 'mithai', 'paan',
    ],
  ],
  [
    'stay',
    [
      'hotel', 'hostel', 'oyo', 'airbnb', 'resort', 'homestay', 'lodge',
      'guesthouse', 'guest house', 'zostel', 'treebo', 'fabhotel', 'stay',
      'room', 'accommodation', 'villa', 'camp', 'tent',
    ],
  ],
  [
    'transport',
    [
      'ola', 'uber', 'rapido', 'taxi', 'cab', 'auto', 'rickshaw', 'bus',
      'train', 'irctc', 'flight', 'indigo', 'spicejet', 'vistara', 'air india',
      'akasa', 'petrol', 'diesel', 'fuel', 'toll', 'fastag', 'parking',
      'metro', 'ferry', 'bike rental', 'scooty', 'redbus', 'railway',
      'transport', 'travel', 'car rental', 'zoomcar',
    ],
  ],
  [
    'activities',
    [
      'ticket', 'tickets', 'entry', 'museum', 'fort', 'palace', 'park',
      'safari', 'trek', 'trekking', 'rafting', 'paragliding', 'scuba',
      'snorkeling', 'bungee', 'zipline', 'movie', 'cinema', 'pvr', 'inox',
      'bookmyshow', 'concert', 'show', 'game', 'bowling', 'gokarting',
      'go karting', 'waterpark', 'water park', 'spa', 'massage', 'club',
      'activity', 'tour', 'guide', 'boating',
    ],
  ],
  [
    'shopping',
    [
      'amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'shoes',
      'souvenir', 'gift', 'gifts', 'market', 'mall', 'store', 'shop',
      'handicraft', 'jewellery', 'jewelry', 'saree', 'kurta', 'tshirt',
      't-shirt', 'sunglasses', 'bag',
    ],
  ],
]

/**
 * Rule-based categorization. Returns the matched category or null when
 * nothing matches (the ambiguous ~15% that goes to the AI gateway).
 */
export function categorizeByRules(description: string): ExpenseCategory | null {
  const normalized = description.toLowerCase()
  for (const [category, keywords] of KEYWORD_RULES) {
    for (const keyword of keywords) {
      // Word-boundary match so "auto" doesn't fire on "autograph"
      const pattern = new RegExp(`(^|[^a-z])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`)
      if (pattern.test(normalized)) return category
    }
  }
  return null
}

/** Validates an AI answer down to a known category, defaulting to misc. */
export function normalizeAiCategory(raw: string): ExpenseCategory {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z]/g, '')
  return (EXPENSE_CATEGORIES as readonly string[]).includes(cleaned)
    ? (cleaned as ExpenseCategory)
    : 'misc'
}

export function buildCategorizePrompt(description: string): string {
  // Keep it tiny — single-word answer keeps tokens (and free-tier usage) minimal
  return (
    `Categorize this expense from a group trip in India into exactly one of: ` +
    `food, stay, transport, activities, shopping, misc.\n` +
    `Expense: "${description.slice(0, 100)}"\n` +
    `Answer with only the category word.`
  )
}

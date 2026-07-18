// src/components/icons/index.tsx
// The nine custom brand glyphs — Blueprint §2.5.1. Drawn on the same 24pt
// grid as Phosphor, 1.5px stroke, round caps/joins, in the stitch language.
// These are the icons users see hourly. Everything else uses Phosphor
// (regular weight) via phosphor-react-native.
//
// All glyphs inherit `color` (default currentColor via theme at call site)
// and never self-color except inside the three madder-budget slots (§2.5.2).

import Svg, { Path, Circle, Line, Rect } from 'react-native-svg'
import {
  Bank, BowlFood, Bed, Car, Confetti, Bag, Note, Star,
  type IconProps,
} from 'phosphor-react-native'
import type { ComponentType } from 'react'
import { CATEGORY_META, type ItineraryCategory } from '@lib/schemas'

interface GlyphProps {
  size?: number
  color?: string
  strokeWidth?: number
}

// ── Itinerary category icon — resolves CATEGORY_META.icon to a Phosphor glyph
// (Blueprint §2.5, replaces the per-category emoji). ──────────────────────
const ITINERARY_GLYPHS: Record<string, ComponentType<IconProps>> = {
  Bank, BowlFood, Bed, Car, Confetti, Bag, Note, Star,
}

interface ItineraryCategoryIconProps {
  category: ItineraryCategory
  size?: number
  color?: string
  weight?: IconProps['weight']
}

export function ItineraryCategoryIcon({ category, size = 20, color, weight = 'regular' }: ItineraryCategoryIconProps) {
  const Glyph = ITINERARY_GLYPHS[CATEGORY_META[category]?.icon] ?? Note
  return <Glyph size={size} color={color} weight={weight} />
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' })

// 1. thread-add — a needle pulling thread through a plus (Add expense FAB)
export function ThreadAdd({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Line x1="12" y1="6" x2="12" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="6" y1="12" x2="18" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* thread running-stitch through the crossbar */}
      <Line x1="3" y1="12" x2="6" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="1.5 1.5" />
      <Line x1="18" y1="12" x2="21" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="1.5 1.5" />
      <Circle cx="12" cy="12" r="1.1" fill={color} />
    </Svg>
  )
}

// 2. thread-knot — a small knot (settled state)
export function ThreadKnot({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M9 9 C6 6 6 6 4 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15 15 C18 18 18 18 20 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// 3. stitch-arrow — running-stitch arrow (settle direction, "A owes B")
export function StitchArrow({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Line x1="3" y1="12" x2="17" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 2.5" />
      <Path d="M15 8 L20 12 L15 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// 4. charpai — woven square (Home tab)
export function Charpai({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="4" y1="10" x2="20" y2="10" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 2" />
      <Line x1="4" y1="14" x2="20" y2="14" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 2" />
      <Line x1="10" y1="4" x2="10" y2="20" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 2" />
      <Line x1="14" y1="4" x2="14" y2="20" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 2" />
    </Svg>
  )
}

// 5. rasta — stitched path (Itinerary tab)
export function Rasta({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M5 19 C5 13 12 13 12 8 C12 4 18 4 19 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 2.5" />
      <Circle cx="5" cy="19" r="1.6" fill={color} />
      <Circle cx="19" cy="5" r="1.6" fill={color} />
    </Svg>
  )
}

// 6. potli — drawstring pouch (Budget tab)
export function Potli({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M7 9 C4 12 4 20 12 20 C20 20 20 12 17 9 Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M8 9 C8 6 16 6 16 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="2 2" />
    </Svg>
  )
}

// 7. taveez — thread locket (Memories tab)
export function Taveez({ size = 24, color = '#000', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x="8" y="8" width="8" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} transform="rotate(45 12 13)" />
      <Path d="M12 5 L12 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="1.5 1.5" />
    </Svg>
  )
}

// 8. baithak — circle of dots (Hangouts tab)
export function Baithak({ size = 24, color = '#000' }: GlyphProps) {
  const cx = 12, cy = 12, r = 7
  const dots = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  return (
    <Svg {...base(size)} fill="none">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r="1.7" fill={color} />
      ))}
    </Svg>
  )
}

// 9. dhaga-logo mark is its own component: see ui/DhagaLogo.tsx

export { WeatherIcon } from './WeatherIcon'

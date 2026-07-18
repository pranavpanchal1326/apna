// src/components/expense/CategoryIcon.tsx
// The one canonical category glyph — Blueprint §2.1.5 (tinted neutrals, not
// rainbow emoji). Maps an ExpenseCategory to its Phosphor icon. Colour is
// inherited (neutral by default); the tinted tile behind it carries the hue.

import { BowlFood, Bed, PathIcon, Confetti, Bag, Needle, type IconProps } from 'phosphor-react-native'
import type { ComponentType } from 'react'
import type { ExpenseCategory } from '@lib/schemas'

const GLYPHS: Record<ExpenseCategory, ComponentType<IconProps>> = {
  food:       BowlFood,
  stay:       Bed,
  transport:  PathIcon,
  activities: Confetti,
  shopping:   Bag,
  misc:       Needle,
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food:       'Food',
  stay:       'Stay',
  transport:  'Transport',
  activities: 'Activities',
  shopping:   'Shopping',
  misc:       'Misc',
}

interface CategoryIconProps {
  category: ExpenseCategory
  size?: number
  color?: string
  weight?: IconProps['weight']
}

export function CategoryIcon({ category, size = 20, color, weight = 'regular' }: CategoryIconProps) {
  const Glyph = GLYPHS[category] ?? Needle
  return <Glyph size={size} color={color} weight={weight} />
}

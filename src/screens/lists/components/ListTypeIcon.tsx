// src/screens/lists/components/ListTypeIcon.tsx
// Icon + label for each list type. Single source of truth for list type metadata.
// Icons per Blueprint §2.5 (Phosphor), replacing the old per-type emoji.

import { View, StyleSheet } from 'react-native'
import { Backpack, ShoppingCart, CheckSquare, type IconProps } from 'phosphor-react-native'
import type { ComponentType } from 'react'
import type { SharedListType } from '../../../lib/schemas/list.schema'

export const LIST_TYPE_META: Record<SharedListType, { label: string; hint: string }> = {
  packing:  { label: 'Packing',  hint: 'What to bring for the trip' },
  grocery:  { label: 'Grocery',  hint: 'Shopping and supplies'      },
  task:     { label: 'Tasks',    hint: 'Things to get done'         },
}

const GLYPHS: Record<SharedListType, ComponentType<IconProps>> = {
  packing: Backpack,
  grocery: ShoppingCart,
  task:    CheckSquare,
}

interface Props {
  type:  SharedListType
  size?: number
  color?: string
}

export function ListTypeIcon({ type, size = 22, color }: Props) {
  const Glyph = GLYPHS[type] ?? CheckSquare
  return (
    <View style={styles.row}>
      <Glyph size={size} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
})

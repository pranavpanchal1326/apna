// src/screens/lists/components/ListTypeIcon.tsx
// Emoji + label for each list type. Single source of truth for list type metadata.

import { View, Text, StyleSheet } from 'react-native'
import type { SharedListType } from '../../../lib/schemas/list.schema'

export const LIST_TYPE_META: Record<SharedListType, { emoji: string; label: string; hint: string }> = {
  packing:  { emoji: '🎒', label: 'Packing',  hint: 'What to bring for the trip' },
  grocery:  { emoji: '🛒', label: 'Grocery',  hint: 'Shopping and supplies'      },
  task:     { emoji: '✅', label: 'Tasks',    hint: 'Things to get done'         },
}

interface Props {
  type:  SharedListType
  size?: number
}

export function ListTypeIcon({ type, size = 22 }: Props) {
  const meta = LIST_TYPE_META[type]
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: size }}>{meta.emoji}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
})

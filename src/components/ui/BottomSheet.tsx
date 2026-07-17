// src/components/ui/BottomSheet.tsx
// DEPRECATED — Blueprint §3.10: BottomSheet is replaced by <Sheet /> (§3.0.6).
// This is a thin compatibility shim so existing call sites migrate to the new
// Kora & Ink sheet (28pt radius, bgTertiary, velocity drag-dismiss) without
// edits. New code should import { Sheet } directly. Phase 3 removes this file
// as each screen's sheets are rewritten.

import React from 'react'
import { type ViewStyle } from 'react-native'
import { Sheet } from './Sheet'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapHeight?: number
  disableBackdropClose?: boolean
  style?: ViewStyle
}

export function BottomSheet(props: BottomSheetProps) {
  return <Sheet {...props} />
}

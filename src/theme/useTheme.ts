// src/theme/useTheme.ts
// Dhaga Theme Hook — use in every component that needs design tokens
// Usage: const { colors, text, spacing, radius, shadows, motion, isDark } = useTheme()

import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeProvider'

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('[apna] useTheme must be used inside <ThemeProvider>. Check App.tsx.')
  }
  return ctx
}

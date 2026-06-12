// src/theme/ThemeProvider.tsx
// Dhaga Theme Provider — wraps entire app, provides theme context
//
// Theme source of truth:
//   1. User explicit preference (stored in MMKV as 'theme-preference')
//   2. System preference via Appearance API
//   3. Fallback: dark (apna default per PRD §7)
//
// Note: MMKV used (not AsyncStorage) — consistent with Prompt 0.1 decision.

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useColorScheme, useWindowDimensions } from 'react-native'
import { createMMKV } from 'react-native-mmkv'

import { DarkColors, LightColors, type AppColors, type ColorScheme } from './colors'
import { Text, FontFamily, FontSize, LineHeight, LetterSpacing } from './typography'
import { Spacing, Layout, Radius, DarkShadows, LightShadows, type Shadows } from './spacing'
import { Duration, Ease, Spring, TimingConfig } from './motion'
import { DarkMapStyle, LightMapStyle } from './mapStyle'
import { useUIStore } from '../stores/ui.store'

// Separate MMKV instance for theme preference
const themeStorage = createMMKV({ id: 'apna-theme' })
const THEME_KEY = 'theme-preference'

export interface ThemeContextValue {
  colors:      AppColors
  text:        typeof Text
  fonts:       typeof FontFamily
  fontSize:    typeof FontSize
  lineHeight:  typeof LineHeight
  letterSpacing: typeof LetterSpacing
  spacing:     typeof Spacing
  layout:      typeof Layout
  radius:      typeof Radius
  shadows:     Shadows
  duration:    typeof Duration
  ease:        typeof Ease
  spring:      typeof Spring
  timing:      typeof TimingConfig
  mapStyle:    typeof DarkMapStyle | typeof LightMapStyle
  scheme:      ColorScheme
  isDark:      boolean
  setScheme:   (scheme: ColorScheme | 'system') => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children?: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme()
  const { fontScale } = useWindowDimensions()
  
  const setFontScale = useUIStore((state) => state.setFontScale)
  const highContrastMode = useUIStore((state) => state.highContrastMode)

  // Synchronize font scale with global UI store
  useEffect(() => {
    setFontScale(fontScale)
  }, [fontScale, setFontScale])

  // Initialize from MMKV — undefined means follow system
  const [userPreference, setUserPreference] = useState<ColorScheme | 'system'>(() => {
    const stored = themeStorage.getString(THEME_KEY)
    return (stored as ColorScheme | 'system' | undefined) ?? 'dark' // apna default: dark
  })

  // Resolve actual scheme
  const scheme: ColorScheme = useMemo(() => {
    if (userPreference === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark'
    }
    return userPreference
  }, [userPreference, systemColorScheme])

  const isDark = scheme === 'dark'

  const setScheme = useCallback((newPref: ColorScheme | 'system') => {
    setUserPreference(newPref)
    themeStorage.set(THEME_KEY, newPref)
  }, [])

  const baseColors = isDark ? DarkColors : LightColors

  // Override textMuted with textSecondary in high contrast mode
  const colors = useMemo<AppColors>(() => {
    if (highContrastMode) {
      if (isDark) {
        return {
          ...DarkColors,
          textMuted: DarkColors.textSecondary,
        } as unknown as AppColors
      } else {
        return {
          ...LightColors,
          textMuted: LightColors.textSecondary,
        } as unknown as AppColors
      }
    }
    return baseColors
  }, [baseColors, highContrastMode, isDark])

  const value = useMemo<ThemeContextValue>(() => ({
    colors,
    text:         Text,
    fonts:        FontFamily,
    fontSize:     FontSize,
    lineHeight:   LineHeight,
    letterSpacing: LetterSpacing,
    spacing:      Spacing,
    layout:       Layout,
    radius:       Radius,
    shadows:      isDark ? DarkShadows : LightShadows,
    duration:     Duration,
    ease:         Ease,
    spring:       Spring,
    timing:       TimingConfig,
    mapStyle:     isDark ? DarkMapStyle : LightMapStyle,
    scheme,
    isDark,
    setScheme,
  }), [colors, isDark, scheme, setScheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

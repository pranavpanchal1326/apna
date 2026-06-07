// src/theme/spacing.ts
// Dhaga Spacing System — 4px base grid
// All values in React Native points. 1 unit = 4pt.
// RULE: Every margin, padding, gap in the app must come from these tokens.
// No arbitrary numbers in StyleSheet.create ever.

export const Spacing = {
  xs:   4,   // Icon gaps, tight groupings inside components
  sm:   8,   // Component internal spacing, icon-text gaps
  md:   12,  // Card padding, list item internal gaps
  lg:   16,  // Screen horizontal padding, section gaps (PRIMARY gap unit)
  xl:   24,  // Major section separators, card margins
  '2xl': 32, // Hero section spacing
  '3xl': 48, // Large section top/bottom padding
  '4xl': 64, // Screen top padding (below status bar + header)
} as const

export type SpacingKey = keyof typeof Spacing

// Screen layout constants — applied to all screens
export const Layout = {
  screenPaddingH:   Spacing.lg,   // 16pt — horizontal padding on all screens
  screenPaddingTop: Spacing.xl,   // 24pt — below navigation header
  cardPadding:      Spacing.md,   // 12pt — inside cards
  sectionGap:       Spacing.xl,   // 24pt — between sections
  tabBarHeight:     56,           // PRD §7 exact value
  headerHeight:     56,           // Standard header height
  bottomSheetHandleHeight: 20,    // Handle + gap at top of bottom sheet
  safeAreaBottom:   16,           // Extra padding above tab bar for safe area
  touchTargetMin:   44,           // WCAG minimum tap target — enforce everywhere
} as const

// Border radius — from PRD §7 exact values
export const Radius = {
  sm:   8,     // Pills, tags, small badges
  md:   12,    // Input fields, small cards
  lg:   16,    // Main cards, bottom sheets
  xl:   24,    // Hero cards, modals
  full: 9999,  // Avatars, circular FAB, pill buttons
} as const

export type RadiusKey = keyof typeof Radius

// Shadows — dark mode only (light mode shadows in ThemeProvider)
// React Native shadow props: iOS uses shadow*, Android uses elevation
// For cross-platform: use both. elevation is Android-only.
export const DarkShadows = {
  card: {
    // iOS
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    // Android
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  accentGlow: {
    // Teal glow effect — use ONLY on primary CTAs and active balance numbers
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
} as const

export const LightShadows = {
  card: {
    shadowColor: '#0A0E1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0A0E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  accentGlow: {
    shadowColor: '#1A9E96',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSheet: {
    shadowColor: '#0A0E1A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
} as const

export interface ShadowConfig {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export interface Shadows {
  card: ShadowConfig
  elevated: ShadowConfig
  accentGlow: ShadowConfig
  bottomSheet: ShadowConfig
}

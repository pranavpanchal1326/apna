// src/theme/spacing.ts
// Kora & Ink spacing system — Blueprint §2.3 / Appendix A.3. 4pt base grid.
// RULE: Every margin, padding, gap in the app must come from these tokens.
// No arbitrary numbers in StyleSheet.create ever.

export const Spacing = {
  xs:   4,   // Icon gaps, tight groupings inside components
  sm:   8,   // Component internal spacing, icon-text gaps
  md:   12,  // Row internal gaps
  lg:   16,  // Component-level gaps
  xl:   24,  // Major separators
  '2xl': 32, // Section gap (PRIMARY separator — whitespace replaces borders)
  '3xl': 48, // Large section top/bottom padding
  '4xl': 64, // Screen top padding (below status bar + header)
} as const

export type SpacingKey = keyof typeof Spacing

// Screen layout constants — Blueprint §2.3.1
export const Layout = {
  screenPaddingH:   20,   // was 16 — extra fabric margin lets editorial type breathe
  screenPaddingTop: 24,
  sectionGap:       32,   // was 24 — whitespace is the primary separator
  rowHeight:        64,   // standard list rows (expense, member, list item)
  rowHeightDense:   56,   // dense rows (settings)
  tabBarHeight:     56,
  headerHeight:     56,
  touchTargetMin:   44,   // WCAG floor — enforce everywhere

  // ── DEPRECATED (delete in Phase 2 sweep) ──
  /** @deprecated cards are demoted (Law 1) — use Row spacing */
  cardPadding:      12,
  /** @deprecated part of <Sheet /> primitive (§3.0.6) */
  bottomSheetHandleHeight: 20,
  /** @deprecated use safe-area insets + sectionGap */
  safeAreaBottom:   16,
} as const

// Border radius — two radii, strictly (§2.3.2). Mixed radii across one
// screen is a template tell; two values create rhythm.
export const Radius = {
  soft:  12,    // Inputs, chips, icon tiles, photos in rows
  sheet: 28,    // Bottom sheets (top corners), modals, memory cards
  full:  9999,  // Avatars, pill buttons, FAB

  // ── DEPRECATED aliases (old 4-step scale — delete in Phase 2) ──
  /** @deprecated use `soft` */
  sm: 12,
  /** @deprecated use `soft` */
  md: 12,
  /** @deprecated use `soft` */
  lg: 12,
  /** @deprecated use `sheet` */
  xl: 28,
} as const

export type RadiusKey = keyof typeof Radius

// ── Elevation — Blueprint §2.3.3 ─────────────────────────────────────
// Shadows are DELETED. Depth comes from the three fabric steps
// (bgPrimary → bgSecondary → bgTertiary) plus scrim for floating layers.
// The ONLY shadow in the app: bottom sheets — physically above the fabric.
export const SheetShadow = {
  dark:  { shadowColor: '#000000', shadowOffset: { width: 0, height: -8 },
           shadowOpacity: 0.18, shadowRadius: 24, elevation: 16 },
  light: { shadowColor: '#1C1A15', shadowOffset: { width: 0, height: -8 },
           shadowOpacity: 0.10, shadowRadius: 24, elevation: 12 },
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

// Flat no-op — keeps legacy `shadows.card` / `shadows.elevated` /
// `shadows.accentGlow` call sites compiling while rendering NOTHING.
// Glow effects are banned (§1.3). Phase 2 deletes these call sites.
const NO_SHADOW: ShadowConfig = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
}

/** @deprecated flat by design — only `bottomSheet` casts a shadow */
export const DarkShadows: Shadows = {
  card: NO_SHADOW,
  elevated: NO_SHADOW,
  accentGlow: NO_SHADOW,
  bottomSheet: SheetShadow.dark,
} as const

/** @deprecated flat by design — only `bottomSheet` casts a shadow */
export const LightShadows: Shadows = {
  card: NO_SHADOW,
  elevated: NO_SHADOW,
  accentGlow: NO_SHADOW,
  bottomSheet: SheetShadow.light,
} as const

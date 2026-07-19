// src/theme/colors.ts
// Kora & Ink color system — Blueprint §2.1 / Appendix A.1. Never change hex
// values without amending docs/DESIGN_BLUEPRINT.md (version bump + changelog).
//
// PRINCIPLES (§2.1.1):
// - Warm everywhere: every neutral carries a yellow-brown undertone.
// - One accent (madder), one supporting semantic (leaf), one warning (haldi).
// - Color encodes meaning only; decoration is done with neutrals.
// - Dark (Ink) and light (Kora) are the same design at different times of day.
//
// The migration-map aliases (§2.1.7 — accentDanger, accentGold, border,
// borderAccent, threadLine, tabDot) were deleted in the Phase 2 sweep
// (19 Jul 2026). Only canonical tokens exist now.

export const InkColors = {
  // ── Fabric ──────────────────────────────────────────────
  bgPrimary:   '#161512',   // Ink cloth — main fabric
  bgSecondary: '#1D1B17',   // Woven step — grouped rows, tab bar
  bgTertiary:  '#26231D',   // Raised weave — inputs, sheets, chips

  // ── Accent: madder (the dyed thread) ────────────────────
  accentPrimary: '#D96A50',
  onAccent:      '#2A0E06',

  // ── Semantic ────────────────────────────────────────────
  positive: '#8FAE9A',      // Leaf — owed to you, settled well
  negative: '#D96A50',      // Madder doubles as "you owe" (money in motion)
  warning:  '#C9A24B',      // Haldi — caution, budget nearing
  settled:  '#8F8878',      // Faded thread — done, quiet

  // ── Text ────────────────────────────────────────────────
  textPrimary:   '#EFEAE0', // Chalk on ink
  textSecondary: '#A39B89', // Faded cotton
  textMuted:     '#736D5E', // Timestamps, hints (AA vs bgPrimary)

  // ── Lines ───────────────────────────────────────────────
  hairline:  'rgba(239,234,224,0.08)', // Structural hairline (rare)
  stitch:    'rgba(217,106,80,0.55)',  // The running stitch — madder
  stitchDim: 'rgba(163,155,137,0.35)', // Neutral stitch — settled/past

  // ── Overlay ─────────────────────────────────────────────
  scrim:   'rgba(12,11,9,0.55)',
  overlay: 'rgba(12,11,9,0.85)',

  // ── System bars & tab bar ───────────────────────────────
  statusBar: '#161512',
  navBar:    '#1D1B17',
  tabBar:    '#1D1B17',
  tabIconActive:   '#EFEAE0',   // Active tab is TEXT-colored, not accent
  tabIconInactive: '#736D5E',
  tabStitch:       '#D96A50',   // 12pt stitch dash under active tab

  // ── Avatar: dyed threads (keyed by uid hash — stable) ───
  avatar: [
    '#D96A50', '#8FAE9A', '#C9A24B', '#A98BB8',
    '#7FA0B8', '#C98B6B', '#B8A98B', '#B87F8F',
  ] as const,

  // ── Categories: icon + tint (no rainbow text — §2.1.5) ──
  category: {
    food:       { icon: 'BowlFood',  tint: 'rgba(201,162,75,0.14)' },
    stay:       { icon: 'Bed',       tint: 'rgba(127,160,184,0.14)' },
    transport:  { icon: 'Path',      tint: 'rgba(143,174,154,0.14)' },
    activities: { icon: 'Confetti',  tint: 'rgba(169,139,184,0.14)' },
    shopping:   { icon: 'Bag',       tint: 'rgba(201,139,107,0.14)' },
    misc:       { icon: 'Needle',    tint: 'rgba(163,155,137,0.14)' },
  },
} as const

export const KoraColors = {
  // ── Fabric ──────────────────────────────────────────────
  bgPrimary:   '#F3EEE4',   // Unbleached cotton
  bgSecondary: '#ECE5D6',   // Woven step
  bgTertiary:  '#E4DCC9',   // Raised weave

  // ── Accent: madder, full-strength dye (AA on kora) ──────
  accentPrimary: '#B0402F',
  onAccent:      '#F9F1EC',

  // ── Semantic ────────────────────────────────────────────
  positive: '#3E5C50',
  negative: '#B0402F',
  warning:  '#8A6A1F',
  settled:  '#8A8272',

  // ── Text ────────────────────────────────────────────────
  textPrimary:   '#1C1A15', // Ink on cotton
  textSecondary: '#6E675A',
  textMuted:     '#948C7A',

  // ── Lines ───────────────────────────────────────────────
  hairline:  'rgba(28,26,21,0.09)',
  stitch:    'rgba(176,64,47,0.6)',
  stitchDim: 'rgba(110,103,90,0.4)',

  // ── Overlay ─────────────────────────────────────────────
  scrim:   'rgba(28,26,21,0.35)',
  overlay: 'rgba(243,238,228,0.9)',

  // ── System bars & tab bar ───────────────────────────────
  statusBar: '#F3EEE4',
  navBar:    '#ECE5D6',
  tabBar:    '#ECE5D6',
  tabIconActive:   '#1C1A15',
  tabIconInactive: '#948C7A',
  tabStitch:       '#B0402F',

  // ── Avatar: dyed threads (deepened one step for contrast) ──
  avatar: [
    '#B0402F', '#3E5C50', '#8A6A1F', '#6E4A80',
    '#3D617A', '#8F5232', '#6E5F3E', '#8A4457',
  ] as const,

  // ── Categories ──────────────────────────────────────────
  category: {
    food:       { icon: 'BowlFood',  tint: 'rgba(138,106,31,0.12)' },
    stay:       { icon: 'Bed',       tint: 'rgba(61,97,122,0.12)' },
    transport:  { icon: 'Path',      tint: 'rgba(62,92,80,0.12)' },
    activities: { icon: 'Confetti',  tint: 'rgba(110,74,128,0.12)' },
    shopping:   { icon: 'Bag',       tint: 'rgba(143,82,50,0.12)' },
    misc:       { icon: 'Needle',    tint: 'rgba(110,103,90,0.12)' },
  },
} as const

// Fallback avatar colour + native accent (notifications, widgets) for
// non-React contexts (lib/, hooks, background tasks) that can't call useTheme.
// Sourced from the token palette so no raw hex leaks into consumer files.
export const DEFAULT_AVATAR_COLOR = InkColors.avatar[0]
export const NATIVE_ACCENT_COLOR  = InkColors.accentPrimary

export type ColorScheme = 'dark' | 'light'
export type InkColorsType  = typeof InkColors
export type KoraColorsType = typeof KoraColors
export type AppColors = InkColorsType | KoraColorsType
export type DarkColorsType = InkColorsType
export type LightColorsType = KoraColorsType

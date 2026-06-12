// src/theme/colors.ts
// Dhaga Color System — exact values from PRD §7. Never change hex values without
// updating PRD §7 simultaneously. These are the source of truth for all UI color.

export const DarkColors = {
  // ── Backgrounds ─────────────────────────────────────────────────
  bgPrimary:    '#080C14',   // Main app background — deep ocean
  bgSecondary:  '#0D1220',   // Card backgrounds
  bgTertiary:   '#141A2C',   // Elevated surfaces, inputs, bottom sheets

  // ── Accent ──────────────────────────────────────────────────────
  accentPrimary:  '#4ECDC4', // Primary CTA, positive balance, active states
  accentDanger:   '#FF6B6B', // Debt, danger, SOS — never use for decoration
  accentGold:     '#FFD166', // Highlights, warmth, memories — use sparingly

  // ── Text ────────────────────────────────────────────────────────
  textPrimary:   '#F0F4FF',  // Main content — headings, amounts, names
  textSecondary: '#8A94B0',  // Labels, metadata, secondary info
  textMuted:     '#6B7591',  // Timestamps, hints, disabled states (WCAG compliant)

  // ── Borders ─────────────────────────────────────────────────────
  border:        'rgba(255,255,255,0.06)',   // Default card border — very subtle
  borderAccent:  'rgba(78,205,196,0.15)',    // Teal-highlighted borders

  // ── Semantic aliases (used in components — prefer these over raw values) ──
  positive:    '#4ECDC4',   // Positive balance (owed to me)
  negative:    '#FF6B6B',   // Negative balance (I owe)
  warning:     '#FFD166',   // Caution states
  settled:     '#8A94B0',   // Fully settled — muted, not celebratory

  // ── Overlay ─────────────────────────────────────────────────────
  overlay:     'rgba(8,12,20,0.85)',   // Modal backdrop
  scrim:       'rgba(8,12,20,0.5)',    // Bottom sheet backdrop

  // ── Avatar palette (8 colors — same order as AVATAR_COLORS in user.types.ts) ──
  avatar: [
    '#4ECDC4',  // teal
    '#FF6B6B',  // coral
    '#FFD166',  // gold
    '#A8E6CF',  // mint
    '#FF8B94',  // pink
    '#7EC8E3',  // sky blue
    '#B5B5FF',  // lavender
    '#FECA57',  // yellow
  ] as const,

  // ── Category colors (expense categories — for icons and labels) ──
  category: {
    food:       '#FF8B94',
    stay:       '#7EC8E3',
    transport:  '#4ECDC4',
    activities: '#FFD166',
    shopping:   '#FF6B6B',
    misc:       '#8A94B0',
  },

  // ── Dhaga thread line ────────────────────────────────────────────
  // The visual thread element connecting activity items, timeline nodes,
  // memory timeline, map route — use ONLY for connector lines.
  threadLine: 'rgba(78,205,196,0.25)',

  // ── Status bar / navigation bar ─────────────────────────────────
  statusBar:  '#080C14',
  navBar:     '#0D1220',

  // ── Tab bar ─────────────────────────────────────────────────────
  tabBar:          '#0D1220',
  tabIconActive:   '#4ECDC4',
  tabIconInactive: '#4A5468',
  tabDot:          '#4ECDC4',  // 4px dot below active tab icon
} as const

export const LightColors = {
  // ── Backgrounds ─────────────────────────────────────────────────
  bgPrimary:   '#F8FAFF',
  bgSecondary: '#FFFFFF',
  bgTertiary:  '#EEF2FF',

  // ── Accent ──────────────────────────────────────────────────────
  accentPrimary: '#1A9E96',  // Darkened teal for WCAG contrast on light bg
  accentDanger:  '#D94F4F',  // Darkened for contrast
  accentGold:    '#C49A00',  // Darkened for contrast

  // ── Text ────────────────────────────────────────────────────────
  textPrimary:   '#0A0E1A',
  textSecondary: '#4A5468',
  textMuted:     '#8A94B0',

  // ── Borders ─────────────────────────────────────────────────────
  border:       'rgba(0,0,0,0.08)',
  borderAccent: 'rgba(26,158,150,0.2)',

  // ── Semantic aliases ────────────────────────────────────────────
  positive: '#1A9E96',
  negative: '#D94F4F',
  warning:  '#C49A00',
  settled:  '#8A94B0',

  // ── Overlay ─────────────────────────────────────────────────────
  overlay: 'rgba(248,250,255,0.88)',
  scrim:   'rgba(10,14,26,0.4)',

  // ── Avatar palette (same order — contrast-adjusted for light bg) ──
  avatar: [
    '#1A9E96',
    '#D94F4F',
    '#C49A00',
    '#2E9E6B',
    '#C25474',
    '#1A7BAF',
    '#6B4FBB',
    '#C49A00',
  ] as const,

  // ── Category colors ─────────────────────────────────────────────
  category: {
    food:       '#C25474',
    stay:       '#1A7BAF',
    transport:  '#1A9E96',
    activities: '#C49A00',
    shopping:   '#D94F4F',
    misc:       '#4A5468',
  },

  // ── Dhaga thread line ────────────────────────────────────────────
  threadLine: 'rgba(26,158,150,0.3)',

  // ── Status bar / navigation bar ─────────────────────────────────
  statusBar: '#F8FAFF',
  navBar:    '#FFFFFF',

  // ── Tab bar ─────────────────────────────────────────────────────
  tabBar:          '#FFFFFF',
  tabIconActive:   '#1A9E96',
  tabIconInactive: '#8A94B0',
  tabDot:          '#1A9E96',
} as const

// Union type — used throughout components
export type ColorScheme = 'dark' | 'light'
export type DarkColorsType = typeof DarkColors
export type LightColorsType = typeof LightColors
export type AppColors = DarkColorsType | LightColorsType

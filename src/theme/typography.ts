// src/theme/typography.ts
// Dhaga Typography System — Outfit + JetBrains Mono
// Load both fonts via expo-font in App.tsx (wired in Prompt 0.5)
//
// SIZE RULES:
// - Minimum: 10pt (Label/Mono Label)
// - Body default: 15pt
// - No font size below 10pt ever — unreadable on Redmi 720p screens
//
// FONT WEIGHT RULES:
// - Outfit 700 = Display (32–48pt) — group names, hero numbers only
// - Outfit 600 = Heading (20–28pt) — screen titles, section headers
// - Outfit 400 = Body (14–16pt) — feed text, descriptions
// - Outfit 500 = Label (10–12pt) — tags, metadata, badges
// - JetBrains Mono 500 = all numeric amounts, invite codes, timestamps

// Font family names — must match names registered in expo-font (Prompt 0.5)
export const FontFamily = {
  display:  'Outfit-Bold',         // Outfit 700 — 32pt+ only
  heading:  'Outfit-SemiBold',     // Outfit 600 — 20pt+ section titles
  body:     'Outfit-Regular',      // Outfit 400 — default prose
  label:    'Outfit-Medium',       // Outfit 500 — small UI labels
  mono:     'JetBrainsMono-Medium',// JetBrains Mono 500 — numbers only
} as const

export type FontFamilyKey = keyof typeof FontFamily

// Type scale — all values in React Native points (pt)
// Points = dp on Android. 1pt = 1dp = 1sp at 1x density.
export const FontSize = {
  // Display — Outfit 700 only
  displayLg: 48,  // Hero number on Budget screen (balance total)
  displayMd: 36,  // Group name hero
  displaySm: 32,  // Screen hero titles

  // Heading — Outfit 600
  headingLg: 28,  // Screen titles (e.g. "Budget", "Memories")
  headingMd: 24,  // Section titles, card titles
  headingSm: 20,  // Subsection headers

  // Body — Outfit 400
  bodyLg: 16,  // Feed items, primary body text
  bodyMd: 15,  // Default body — slightly smaller than web norm (mobile density)
  bodySm: 14,  // Secondary body, list items

  // Label — Outfit 500
  labelLg: 13,  // Badges, chips, small buttons
  labelMd: 12,  // Metadata, category labels
  labelSm: 10,  // Minimum size — timestamps, hints only

  // Mono — JetBrains Mono 500 (amounts, codes)
  monoLg: 24,  // Hero balance amounts
  monoMd: 16,  // Expense item amounts in list
  monoSm: 13,  // Timestamps, invite codes, small amounts
} as const

export type FontSizeKey = keyof typeof FontSize

// Line height multipliers — React Native uses absolute lineHeight (pt), not ratios
export const LineHeight = {
  displayLg: 56,
  displayMd: 44,
  displaySm: 40,
  headingLg: 34,
  headingMd: 30,
  headingSm: 26,
  bodyLg: 24,
  bodyMd: 22,
  bodySm: 21,
  labelLg: 18,
  labelMd: 17,
  labelSm: 15,
  monoLg: 30,
  monoMd: 22,
  monoSm: 18,
} as const

// Letter spacing — React Native uses pt, not em
export const LetterSpacing = {
  tight:   -0.5,  // Display text
  normal:   0,    // Body text
  wide:     0.5,  // Labels, metadata
  widest:   1.5,  // ALL CAPS labels (e.g. "DAY 1 · JAIPUR")
} as const

// Pre-composed text style objects — use these in StyleSheet.create
// Pattern: Text.display.lg, Text.body.md, Text.mono.lg
export const Text = {
  display: {
    lg: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displayLg,
      lineHeight: LineHeight.displayLg,
      letterSpacing: LetterSpacing.tight,
    },
    md: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displayMd,
      lineHeight: LineHeight.displayMd,
      letterSpacing: LetterSpacing.tight,
    },
    sm: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displaySm,
      lineHeight: LineHeight.displaySm,
      letterSpacing: LetterSpacing.tight,
    },
  },
  heading: {
    lg: {
      fontFamily: FontFamily.heading,
      fontSize: FontSize.headingLg,
      lineHeight: LineHeight.headingLg,
      letterSpacing: LetterSpacing.tight,
    },
    md: {
      fontFamily: FontFamily.heading,
      fontSize: FontSize.headingMd,
      lineHeight: LineHeight.headingMd,
      letterSpacing: LetterSpacing.normal,
    },
    sm: {
      fontFamily: FontFamily.heading,
      fontSize: FontSize.headingSm,
      lineHeight: LineHeight.headingSm,
      letterSpacing: LetterSpacing.normal,
    },
  },
  body: {
    lg: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.bodyLg,
      lineHeight: LineHeight.bodyLg,
      letterSpacing: LetterSpacing.normal,
    },
    md: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.bodyMd,
      lineHeight: LineHeight.bodyMd,
      letterSpacing: LetterSpacing.normal,
    },
    sm: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.bodySm,
      lineHeight: LineHeight.bodySm,
      letterSpacing: LetterSpacing.normal,
    },
  },
  label: {
    lg: {
      fontFamily: FontFamily.label,
      fontSize: FontSize.labelLg,
      lineHeight: LineHeight.labelLg,
      letterSpacing: LetterSpacing.wide,
    },
    md: {
      fontFamily: FontFamily.label,
      fontSize: FontSize.labelMd,
      lineHeight: LineHeight.labelMd,
      letterSpacing: LetterSpacing.wide,
    },
    sm: {
      fontFamily: FontFamily.label,
      fontSize: FontSize.labelSm,
      lineHeight: LineHeight.labelSm,
      letterSpacing: LetterSpacing.widest,
    },
  },
  mono: {
    lg: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.monoLg,
      lineHeight: LineHeight.monoLg,
      letterSpacing: LetterSpacing.tight,
    },
    md: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.monoMd,
      lineHeight: LineHeight.monoMd,
      letterSpacing: LetterSpacing.normal,
    },
    sm: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.monoSm,
      lineHeight: LineHeight.monoSm,
      letterSpacing: LetterSpacing.normal,
    },
  },
} as const

// Expo font loading map — use with useFonts() in Prompt 0.5
// Key = font family name registered. Value = require() path.
export const FONT_ASSET_MAP = {
  'Outfit-Regular':       require('../../assets/fonts/Outfit-Regular.ttf'),
  'Outfit-Medium':        require('../../assets/fonts/Outfit-Medium.ttf'),
  'Outfit-SemiBold':      require('../../assets/fonts/Outfit-SemiBold.ttf'),
  'Outfit-Bold':          require('../../assets/fonts/Outfit-Bold.ttf'),
  'JetBrainsMono-Medium': require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
} as const

// ⬇️ FONT FILE SETUP INSTRUCTIONS (for developer — not AI output):
// Download these free fonts and place in assets/fonts/:
//   Outfit family:        https://fonts.google.com/specimen/Outfit
//   JetBrains Mono:       https://fonts.google.com/specimen/JetBrains+Mono
// Files needed:
//   Outfit-Regular.ttf, Outfit-Medium.ttf, Outfit-SemiBold.ttf, Outfit-Bold.ttf
//   JetBrainsMono-Medium.ttf
// Create the folder: mkdir -p assets/fonts

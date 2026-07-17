// src/theme/typography.ts
// Kora & Ink Typography System — Blueprint §2.2 / Appendix A.2
// Cabinet Grotesk (display/heading) + General Sans (body/label) + Spline Sans Mono (amounts).
// Never change values without amending docs/DESIGN_BLUEPRINT.md (version bump + changelog).
//
// SIZE RULES:
// - Minimum: 11pt (labelSm) — floor raised from 10 for Redmi 720p legibility
// - Body default: 15pt
// - Amounts always mono, tabular, right-aligned in rows (see <Amount /> §3.0.4)
//
// COMPOSITION RULES (§2.2.3):
// - Display uses Cabinet Grotesk 800, letterSpacing -1, tight lineHeight (~1.05×)
// - ALL-CAPS only at labelSm with letterSpacing 2 (StitchLabel pattern)
// - Never mix two type colors in one line except the ₹-at-0.8em rule

// Font family names — must match names registered via expo-font (FONT_ASSET_MAP)
export const FontFamily = {
  display: 'CabinetGrotesk-Extrabold', // 800 — editorial heroes only
  heading: 'CabinetGrotesk-Bold',      // 700 — titles, section heads
  body:    'GeneralSans-Regular',      // 400 — default prose
  label:   'GeneralSans-Medium',       // 500 — small UI labels
  mono:    'SplineSansMono-Medium',    // 500 — amounts, codes, time
} as const

export type FontFamilyKey = keyof typeof FontFamily

// Type scale — React Native points. Structure kept from the old system;
// displayLg drops 48→44 (Cabinet 800 reads heavier), label floor 10→11.
export const FontSize = {
  // Display — Cabinet Grotesk 800
  displayLg: 44,  // ONE per app: the money number (Budget hero, SettleUp)
  displayMd: 34,  // Group name hero, Trip Wrap stats
  displaySm: 28,  // Screen heroes (Memories, Itinerary day)

  // Heading — Cabinet Grotesk 700
  headingLg: 24,  // Screen titles
  headingMd: 20,  // Section titles
  headingSm: 17,  // Card/sheet titles

  // Body — General Sans 400
  bodyLg: 16,
  bodyMd: 15,
  bodySm: 13,

  // Label — General Sans 500
  labelLg: 13,
  labelMd: 12,
  labelSm: 11,    // floor — Redmi 720p legibility

  // Mono — Spline Sans Mono 500
  monoLg: 26,     // list-hero amounts
  monoMd: 16,     // row amounts
  monoSm: 12,     // timestamps, codes
} as const

export type FontSizeKey = keyof typeof FontSize

// Absolute line heights (pt) — display is tight (~1.05×), "set" not typed
export const LineHeight = {
  displayLg: 46, displayMd: 36, displaySm: 30,
  headingLg: 30, headingMd: 26, headingSm: 22,
  bodyLg: 24, bodyMd: 22, bodySm: 20,
  labelLg: 18, labelMd: 16, labelSm: 15,
  monoLg: 32, monoMd: 22, monoSm: 16,
} as const

// Letter spacing — pt
export const LetterSpacing = {
  display: -1,    // Display sizes only (§2.2.3)
  tight:   -0.5,  // Headings
  normal:   0,    // Body, mono
  wide:     0.5,  // Labels
  caps:     2,    // ALL-CAPS labelSm (StitchLabel) — the only caps allowed
} as const

// Pre-composed text style objects — use in StyleSheet.create
// Pattern: Text.display.lg, Text.body.md, Text.mono.lg
export const Text = {
  display: {
    lg: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displayLg,
      lineHeight: LineHeight.displayLg,
      letterSpacing: LetterSpacing.display,
    },
    md: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displayMd,
      lineHeight: LineHeight.displayMd,
      letterSpacing: LetterSpacing.display,
    },
    sm: {
      fontFamily: FontFamily.display,
      fontSize: FontSize.displaySm,
      lineHeight: LineHeight.displaySm,
      letterSpacing: LetterSpacing.display,
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
      letterSpacing: LetterSpacing.tight,
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
      letterSpacing: LetterSpacing.caps,
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

// Expo font loading map — use with useFonts()
export const FONT_ASSET_MAP = {
  'CabinetGrotesk-Extrabold': require('../../assets/fonts/CabinetGrotesk-Extrabold.ttf'),
  'CabinetGrotesk-Bold':      require('../../assets/fonts/CabinetGrotesk-Bold.ttf'),
  'GeneralSans-Regular':      require('../../assets/fonts/GeneralSans-Regular.ttf'),
  'GeneralSans-Medium':       require('../../assets/fonts/GeneralSans-Medium.ttf'),
  'SplineSansMono-Medium':    require('../../assets/fonts/SplineSansMono-Medium.ttf'),
} as const
// Sources: Cabinet Grotesk + General Sans → fontshare.com (free license);
// Spline Sans Mono → fonts.google.com. All permit app embedding.
//
// Devanagari note (§2.2.1): when Hindi UI ships, pair Anek Devanagari (display)
// and Mukta (body) as fallback chains — Fontshare faces lack Devanagari.

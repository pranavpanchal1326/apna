// src/lib/fonts.ts
// Expo font loading — useFonts hook wrapper.
// Called in App.tsx. App renders SplashScreen until fonts are ready.
// FONT_ASSET_MAP defined in typography.ts (Prompt 0.2).

import { useFonts } from 'expo-font'
import { FONT_ASSET_MAP } from '@theme/typography'

/**
 * Load all Dhaga fonts.
 * Returns [fontsLoaded, fontError].
 * App must NOT render content until fontsLoaded is true.
 */
export function useDhagaFonts() {
  return useFonts(FONT_ASSET_MAP)
}

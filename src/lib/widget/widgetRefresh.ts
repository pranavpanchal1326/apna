// src/lib/widget/widgetRefresh.ts
// Calls the native ApnaWidgetModule to request Android to refresh both widgets.
// The module is registered by ApnaWidgetPackage via the Expo config plugin.
// In Expo Go or CI environments where the native module is absent, the call is
// silently swallowed to prevent a white-screen crash.

import { NativeModules, Platform } from 'react-native'
import { captureError } from '@lib/sentry'

interface ApnaWidgetModuleInterface {
  refreshAllWidgets: () => void
}

function getModule(): ApnaWidgetModuleInterface | null {
  if (Platform.OS !== 'android') return null
  const mod = NativeModules['ApnaWidgetModule'] as ApnaWidgetModuleInterface | undefined
  if (!mod || typeof mod.refreshAllWidgets !== 'function') return null
  return mod
}

/**
 * Signals Android to trigger a Glance update on all ApnaWidget instances.
 * Fire-and-forget — never throws.
 */
export function refreshWidgets(): void {
  try {
    const mod = getModule()
    mod?.refreshAllWidgets()
  } catch (err) {
    captureError(err as Error, { source: 'widget.widgetRefresh.refreshWidgets' })
  }
}

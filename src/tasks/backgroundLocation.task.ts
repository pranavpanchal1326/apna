import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as Sentry from '@sentry/react-native'
import { createMMKV } from 'react-native-mmkv'
import { writeLocationUpdate } from '../lib/firebase/location'
import { getActiveGroupId, getUserId } from '../lib/session'
import { sessionTimer } from '../lib/location/sessionTimer'
import { writeWidgetData, refreshWidgets } from '../lib/widget'

export const BACKGROUND_LOCATION_TASK = 'apna-background-location'

const locationStorage = createMMKV({ id: 'apna-location' })

let lastWriteTime = 0

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    Sentry.captureException(new Error(`Background location task error: ${error.message}`))
    return
  }

  if (!data) return

  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations || locations.length === 0) return

  const latestLocation = locations[locations.length - 1]
  if (!latestLocation) return

  const now = Date.now()
  // Debounce writes (12 seconds minimum) to conserve battery
  if (now - lastWriteTime < 12000) {
    return
  }

  const groupId = getActiveGroupId()
  const userId = getUserId()

  if (!groupId || !userId) {
    Sentry.addBreadcrumb({
      category: 'background-location',
      message: 'task stopped: missing session info',
      level: 'warning',
    })
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      sessionTimer.clear()
    } catch (err) {
      // Ignored
    }
    return
  }

  // Check 4-hour expiration
  if (sessionTimer.isExpired()) {
    Sentry.addBreadcrumb({
      category: 'background-location',
      message: 'task stopped: session_expired',
      level: 'warning',
    })
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      sessionTimer.clear()
      // Write offline to RTDB
      await writeLocationUpdate({
        groupId,
        userId,
        lat: 0,
        lng: 0,
        accuracy: 0,
        timestamp: Date.now(),
        sharing: false,
      })
    } catch (err) {
      // Ignored
    }
    return
  }

  const { latitude, longitude, accuracy } = latestLocation.coords

  try {
    // Respect Ghost Mode in real-time
    const isGhostMode = locationStorage.getBoolean('location_ghost_mode') ?? false

    await writeLocationUpdate({
      groupId,
      userId,
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ?? 10,
      timestamp: latestLocation.timestamp,
      sharing: !isGhostMode,
    })

    lastWriteTime = now

    // Sync map widget — update the current user's sharing state.
    // Full member map is only available in the foreground; here we just
    // ensure the widget file updatedAt timestamp advances so the widget
    // re-renders with latest data when the app next opens.
    void writeWidgetData({}).then(() => {
      refreshWidgets()
    })

    Sentry.addBreadcrumb({
      category: 'background-location',
      message: 'write success',
      data: { groupId, lat: latitude, lng: longitude, accuracy },
      level: 'info',
    })
  } catch (err) {
    Sentry.captureException(err as Error)
  }
})


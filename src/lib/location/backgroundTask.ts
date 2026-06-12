import * as Location from 'expo-location'
import * as Sentry from '@sentry/react-native'
import { BACKGROUND_LOCATION_TASK } from '../../tasks/backgroundLocation.task'
import { getLocationPermissionStatus, type LocationPermissionStatus } from './permissions'
import { sessionTimer } from './sessionTimer'
import { setActiveGroupId, setUserId, getActiveGroupId, getUserId } from '../session'
import { writeLocationUpdate } from '../firebase/location'

export interface BackgroundLocationState {
  isRunning: boolean
  permissionStatus: LocationPermissionStatus
  remainingMs: number
  startedAt: number | null
}

export async function startBackgroundLocationTask(params: {
  groupId: string
  userId: string
}): Promise<{ success: boolean; reason?: string }> {
  const status = await getLocationPermissionStatus()
  if (status === 'undetermined' || status === 'denied') {
    return { success: false, reason: 'foreground_permission_denied' }
  }
  if (status === 'foreground_only') {
    return { success: false, reason: 'background_permission_denied' }
  }

  // If already running, stop first
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  if (isRunning) {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    } catch (err) {
      // Ignored
    }
  }

  // Save session details in MMKV
  setActiveGroupId(params.groupId)
  setUserId(params.userId)

  // Start session timer
  sessionTimer.start()

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'apna is sharing your location',
        notificationBody: 'Tap to stop',
        notificationColor: '#4ECDC4',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    })
    return { success: true }
  } catch (err) {
    Sentry.captureException(err as Error)
    return { success: false, reason: 'start_failed' }
  }
}

export async function stopBackgroundLocationTask(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  if (isRunning) {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
    } catch (err) {
      Sentry.captureException(err as Error)
    }
  }

  // Clear timer
  sessionTimer.clear()

  const groupId = getActiveGroupId()
  const userId = getUserId()

  if (groupId && userId) {
    try {
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
      Sentry.captureException(err as Error)
    }
  }
}

export async function getBackgroundLocationState(): Promise<BackgroundLocationState> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  const permissionStatus = await getLocationPermissionStatus()
  const remainingMs = sessionTimer.remainingMs()
  const startedAt = sessionTimer.startedAt()

  return {
    isRunning,
    permissionStatus,
    remainingMs,
    startedAt,
  }
}

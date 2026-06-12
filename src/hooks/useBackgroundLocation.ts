import { useEffect, useState, useCallback } from 'react'
import { useLocationStore } from '../stores/location.store'
import { useAuthStore } from '../stores/auth.store'
import { useGroupStore } from '../stores/group.store'
import { useUIStore } from '../stores/ui.store'
import {
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
  getBackgroundLocationState,
} from '../lib/location/backgroundTask'
import {
  requestForegroundPermission,
  requestBackgroundPermission,
  type LocationPermissionStatus,
} from '../lib/location/permissions'

export interface UseBackgroundLocationResult {
  isSharing: boolean
  permissionStatus: LocationPermissionStatus
  remainingMs: number
  canShare: boolean
  startSharing(): Promise<void>
  stopSharing(): Promise<void>
  requestPermissions(): Promise<void>
}

export function useBackgroundLocation(): UseBackgroundLocationResult {
  const {
    isBackgroundActive,
    backgroundRemainingMs,
    setBackgroundActive,
    setBackgroundRemainingMs,
    startSession,
    stopSession,
  } = useLocationStore()

  const activeGroup = useGroupStore((s) => s.activeGroup)
  const user = useAuthStore((s) => s.user)
  const showToast = useUIStore((s) => s.showToast)

  const [permStatus, setPermStatus] = useState<LocationPermissionStatus>('undetermined')

  const updateState = useCallback(async () => {
    const state = await getBackgroundLocationState()
    setPermStatus(state.permissionStatus)
    setBackgroundActive(state.isRunning, state.startedAt ?? undefined)
    setBackgroundRemainingMs(state.remainingMs)

    // Sync isSharing foreground/background state
    const currentIsSharing = useLocationStore.getState().isSharing
    if (state.isRunning !== currentIsSharing) {
      if (state.isRunning && activeGroup?.id) {
        // Hydrate sharing session state in location store
        useLocationStore.setState({
          isSharing: true,
          activeGroupId: activeGroup.id,
          sessionStartTime: state.startedAt,
          sessionExpiryTime: state.startedAt ? state.startedAt + 4 * 60 * 60 * 1000 : null,
        })
      } else if (!state.isRunning) {
        useLocationStore.setState({
          isSharing: false,
          sessionStartTime: null,
          sessionExpiryTime: null,
          activeGroupId: null,
        })
      }
    }
  }, [activeGroup?.id, setBackgroundActive, setBackgroundRemainingMs])

  // Sync on mount and periodically
  useEffect(() => {
    updateState()
    const interval = setInterval(updateState, 30000)
    return () => clearInterval(interval)
  }, [updateState])

  const startSharing = async () => {
    if (!activeGroup?.id || !user?.uid) {
      showToast({ message: 'No active group or user session found.', type: 'error' })
      return
    }

    const res = await startBackgroundLocationTask({
      groupId: activeGroup.id,
      userId: user.uid,
    })

    if (res.success) {
      // Set location store active session
      await startSession(activeGroup.id)
      await updateState()
      showToast({ message: 'Background location sharing active.', type: 'success' })
    } else {
      let errorMsg = 'Failed to start background location.'
      if (res.reason === 'foreground_permission_denied') {
        errorMsg = 'Location permission is denied. Please enable it in settings.'
      } else if (res.reason === 'background_permission_denied') {
        errorMsg = 'Background location access is required. Please set to "Allow all the time".'
      }
      showToast({ message: errorMsg, type: 'error' })
    }
  }

  const stopSharing = async () => {
    await stopBackgroundLocationTask()
    await stopSession()
    await updateState()
    showToast({ message: 'Location sharing stopped.', type: 'info' })
  }

  const requestPermissions = async () => {
    const fgGranted = await requestForegroundPermission()
    if (!fgGranted) {
      setPermStatus('denied')
      return
    }
    const bgGranted = await requestBackgroundPermission()
    if (bgGranted) {
      setPermStatus('background_granted')
    } else {
      setPermStatus('foreground_only')
    }
  }

  const canShare = permStatus === 'background_granted'

  return {
    isSharing: isBackgroundActive,
    permissionStatus: permStatus,
    remainingMs: backgroundRemainingMs,
    canShare,
    startSharing,
    stopSharing,
    requestPermissions,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { AppState, type AppStateStatus, Linking } from 'react-native'
import {
  getCameraPermissionStatus,
  requestCameraPermission,
  getMediaLibraryPermissionStatus,
  requestMediaLibraryPermission,
  type CameraPermissionStatus,
  type MediaLibraryPermissionStatus,
} from '../lib/camera/permissions'

export interface UseCameraPermissionsResult {
  cameraStatus: CameraPermissionStatus
  mediaStatus: MediaLibraryPermissionStatus
  hasCamera: boolean
  hasMedia: boolean
  requestCamera(): Promise<boolean>
  requestMedia(): Promise<boolean>
  openSettings(): void
}

export function useCameraPermissions(): UseCameraPermissionsResult {
  const [cameraStatus, setCameraStatus] = useState<CameraPermissionStatus>('undetermined')
  const [mediaStatus, setMediaStatus] = useState<MediaLibraryPermissionStatus>('undetermined')

  const updatePermissions = useCallback(async () => {
    const cam = await getCameraPermissionStatus()
    const med = await getMediaLibraryPermissionStatus()
    setCameraStatus(cam)
    setMediaStatus(med)
  }, [])

  // Sync on mount and AppState transitions (e.g. returning from system settings)
  useEffect(() => {
    updatePermissions()

    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        updatePermissions()
      }
    })

    return () => sub.remove()
  }, [updatePermissions])

  const requestCamera = async () => {
    const granted = await requestCameraPermission()
    setCameraStatus(granted ? 'granted' : 'denied')
    return granted
  }

  const requestMedia = async () => {
    const granted = await requestMediaLibraryPermission()
    setMediaStatus(granted ? 'granted' : 'denied')
    return granted
  }

  const openSettings = () => {
    Linking.openSettings()
  }

  return {
    cameraStatus,
    mediaStatus,
    hasCamera: cameraStatus === 'granted',
    hasMedia: mediaStatus === 'granted' || mediaStatus === 'limited',
    requestCamera,
    requestMedia,
    openSettings,
  }
}

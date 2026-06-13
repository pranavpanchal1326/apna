import { Camera } from 'expo-camera'
import * as MediaLibrary from 'expo-media-library'

export type CameraPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'

export type MediaLibraryPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'limited'     // iOS only but type must exist for cross-platform safety
  | 'denied'

export async function getCameraPermissionStatus(): Promise<CameraPermissionStatus> {
  const status = await Camera.getCameraPermissionsAsync()
  if (status.status === 'undetermined') return 'undetermined'
  if (status.granted) return 'granted'
  return 'denied'
}

export async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.requestCameraPermissionsAsync()
  return status.granted
}

export async function getMediaLibraryPermissionStatus(): Promise<MediaLibraryPermissionStatus> {
  const status = await MediaLibrary.getPermissionsAsync()
  if (status.status === 'undetermined') return 'undetermined'
  if (status.granted) return 'granted'
  if ((status as any).accessPrivileges === 'limited') return 'limited'
  return 'denied'
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const status = await MediaLibrary.requestPermissionsAsync()
  return status.granted
}

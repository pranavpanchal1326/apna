import * as Location from 'expo-location'

export type LocationPermissionStatus =
  | 'undetermined'
  | 'foreground_only'
  | 'background_granted'
  | 'denied'

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const fg = await Location.getForegroundPermissionsAsync()
  if (!fg.granted) {
    if (fg.canAskAgain) return 'undetermined'
    return 'denied'
  }
  
  const bg = await Location.getBackgroundPermissionsAsync()
  if (bg.granted) {
    return 'background_granted'
  }
  
  return 'foreground_only'
}

export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  return status === 'granted'
}

export async function requestBackgroundPermission(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync()
  if (!fg.granted) {
    return false
  }
  const { status } = await Location.requestBackgroundPermissionsAsync()
  return status === 'granted'
}

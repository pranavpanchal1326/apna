import { ref, set } from 'firebase/database'
import { rtdb } from './config'
import type { LocationUpdate } from '@lib/types/location.types'

export interface WriteLocationParams {
  groupId: string
  userId: string
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  sharing: boolean
}

export async function writeLocationUpdate(params: WriteLocationParams): Promise<void> {
  const locRef = ref(rtdb, `groups/${params.groupId}/locations/${params.userId}`)
  const update: LocationUpdate = {
    lat: params.lat,
    lng: params.lng,
    accuracy: params.accuracy,
    timestamp: params.timestamp,
    sharing: params.sharing,
  }
  await set(locRef, update)
}

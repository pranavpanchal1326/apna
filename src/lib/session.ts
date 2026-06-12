import { createMMKV } from 'react-native-mmkv'

const sessionStorage = createMMKV({ id: 'apna-session' })

const ACTIVE_GROUP_KEY = 'session_active_group_id'
const USER_ID_KEY = 'session_user_id'

export function getActiveGroupId(): string | null {
  return sessionStorage.getString(ACTIVE_GROUP_KEY) ?? null
}

export function getUserId(): string | null {
  return sessionStorage.getString(USER_ID_KEY) ?? null
}

export function setActiveGroupId(groupId: string): void {
  sessionStorage.set(ACTIVE_GROUP_KEY, groupId)
}

export function setUserId(uid: string): void {
  sessionStorage.set(USER_ID_KEY, uid)
}

export function clearSession(): void {
  sessionStorage.remove(ACTIVE_GROUP_KEY)
  sessionStorage.remove(USER_ID_KEY)
}

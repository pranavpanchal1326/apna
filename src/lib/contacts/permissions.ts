import * as Contacts from 'expo-contacts'

export type ContactsPermissionStatus = 'undetermined' | 'granted' | 'denied'

export async function getContactsPermissionStatus(): Promise<ContactsPermissionStatus> {
  const { status } = await Contacts.getPermissionsAsync()
  if (status === Contacts.PermissionStatus.GRANTED) {
    return 'granted'
  }
  if (status === Contacts.PermissionStatus.DENIED) {
    return 'denied'
  }
  return 'undetermined'
}

export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync()
  return status === Contacts.PermissionStatus.GRANTED
}

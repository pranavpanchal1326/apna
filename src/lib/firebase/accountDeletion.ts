// src/lib/firebase/accountDeletion.ts
// Client wrapper for the GDPR account-deletion callable (PRD §23).
// The server does all destructive work; the client only signs out afterwards.

import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

const deleteAccountFn = httpsCallable<Record<string, never>, { success: boolean }>(
  functions,
  'deleteAccount',
)

/**
 * Permanently deletes the signed-in user's account:
 * groups membership, posted memories + photos, avatar, PII in the user doc,
 * and the Firebase Auth user itself. Irreversible.
 */
export async function deleteAccount(): Promise<{ success: boolean }> {
  const result = await deleteAccountFn({})
  return result.data
}

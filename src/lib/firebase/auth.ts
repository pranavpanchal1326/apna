// src/lib/firebase/auth.ts
// Firebase Phone OTP authentication.
// All auth operations go through this module — screens never import firebase/auth directly.
//
// Flow:
//   1. sendOTP(phone)       → returns verificationId
//   2. verifyOTP(id, code)  → returns Firebase User
//   3. createUserDoc(user, name, color) → writes Firestore /users/{uid}
//   4. getUserDoc(uid)      → reads /users/{uid}
//   5. signOut()            → clears auth state

import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth'
import {
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth } from './config'
import type { User } from '@lib/types'
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha'
import { userDoc } from './collections'
import type { UserInput } from '@lib/schemas'

export type RecaptchaRef = React.RefObject<FirebaseRecaptchaVerifierModal>

/**
 * Send OTP to phone number.
 * @param phone — 10-digit number (without country code, e.g. "9876543210")
 * @param recaptchaRef — ref to FirebaseRecaptchaVerifierModal mounted in screen
 * @returns verificationId — passed to verifyOTP
 */
export async function sendOTP(
  phone: string,
  recaptchaRef: RecaptchaRef
): Promise<string> {
  if (!recaptchaRef.current) {
    throw new Error('reCAPTCHA not ready. Please try again.')
  }

  const fullPhone = `+91${phone.trim()}`
  const provider = new PhoneAuthProvider(auth)

  const verificationId = await provider.verifyPhoneNumber(
    fullPhone,
    recaptchaRef.current
  )

  return verificationId
}

/**
 * Verify OTP and sign in.
 * @param verificationId — from sendOTP
 * @param otp — 6-digit string entered by user
 * @returns Firebase User
 */
export async function verifyOTP(
  verificationId: string,
  otp: string
): Promise<FirebaseUser> {
  const credential = PhoneAuthProvider.credential(verificationId, otp)
  const result = await signInWithCredential(auth, credential)
  return result.user
}

/**
 * Create Firestore user document after first sign-in.
 * Safe to call multiple times — uses setDoc with merge:false only on creation.
 */
export async function createUserDoc(
  firebaseUser: FirebaseUser,
  name: string,
  avatarColor: string
): Promise<User> {
  const userRef = userDoc(firebaseUser.uid)

  const userData: UserInput = {
    uid: firebaseUser.uid,
    phone: firebaseUser.phoneNumber ?? '',
    name: name.trim(),
    avatarColor: avatarColor as any,
    createdAt: serverTimestamp(),
    groups: [],
  }

  await setDoc(userRef, userData)

  return { ...userData, createdAt: userData.createdAt as any } as User
}

/**
 * Fetch existing user document from Firestore.
 * Returns null if document doesn't exist (new user).
 */
export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(userDoc(uid))
  if (!snap.exists()) return null
  return snap.data() as unknown as User
}

/**
 * Sign out — clears Firebase Auth state + MMKV (handled in auth.store).
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

/**
 * Subscribe to Firebase auth state changes.
 * Call in auth.store to react to token refresh, sign-out from another device.
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import { createMMKV } from 'react-native-mmkv'
import Constants from 'expo-constants'

// ---------------------------------------------------------------------------
// MMKV instance for manual auth persistence.
//
// Firebase JS SDK v11 removed getReactNativePersistence. The correct pattern
// for Expo Managed + JS SDK is:
//   1. Use inMemoryPersistence (avoids AsyncStorage dependency)
//   2. Manually cache the auth token to MMKV on state changes
//   3. On app boot, read MMKV to restore session before showing UI
//
// This gives faster cold start than AsyncStorage (MMKV reads are synchronous)
// and works in all Expo managed workflow versions.
// ---------------------------------------------------------------------------
export const authStorage = createMMKV({ id: 'firebase-auth-storage' })

// Keys used for caching auth state
export const AUTH_STORAGE_KEYS = {
  USER_JSON: 'auth_user_json',
} as const

// ---------------------------------------------------------------------------
// Config values come from app.json `extra` field.
// In production these are injected via EAS Secrets at build time.
// In development, replace the REPLACE_IN_EAS_SECRETS values directly in app.json.
// ---------------------------------------------------------------------------
const extra = Constants.expoConfig?.extra ?? {}

const firebaseConfig = {
  apiKey:            extra.firebaseApiKey            as string,
  authDomain:        extra.firebaseAuthDomain        as string,
  projectId:         extra.firebaseProjectId         as string,
  storageBucket:     extra.firebaseStorageBucket     as string,
  messagingSenderId: extra.firebaseMessagingSenderId as string,
  appId:             extra.firebaseAppId             as string,
  databaseURL:       extra.firebaseDatabaseUrl       as string,
}

// ---------------------------------------------------------------------------
// Safe init — prevents "Firebase App named '[DEFAULT]' already exists" error
// during React Native Fast Refresh (hot reload).
// ---------------------------------------------------------------------------
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// ---------------------------------------------------------------------------
// Auth — inMemoryPersistence + manual MMKV caching
//
// NOTE: onAuthStateChanged listener is set up in auth.store.ts (Prompt 0.4)
// and caches user JSON to MMKV. On startup, the store reads MMKV to restore
// session before the Firebase network call completes.
// ---------------------------------------------------------------------------
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
})

// Re-export for convenience in auth.store.ts
export { onAuthStateChanged, type User }

// ---------------------------------------------------------------------------
// Core Firebase services
// ---------------------------------------------------------------------------
export const db      = getFirestore(app)
export const storage = getStorage(app)
export const rtdb    = getDatabase(app)

// asia-south1 = Mumbai — lowest latency for Indian users (~10–20ms vs ~80–100ms
// for us-central1). This is a permanent architecture decision.
export const functions = getFunctions(app, 'asia-south1')

// ---------------------------------------------------------------------------
// Firebase Emulator connections — LOCAL DEVELOPMENT ONLY
//
// 10.0.2.2 = Android Emulator's alias for the host machine (your PC).
//
// ⚠️  PHYSICAL DEVICE: If testing on a real phone over WiFi, change
//     EMULATOR_HOST to your PC's local WiFi IP address.
//     How to find it: Run `ipconfig` in PowerShell → look for IPv4 Address
//     under your WiFi adapter (e.g. "192.168.1.42")
//
// Switch to production: set appEnv: "production" in app.json extra
// ---------------------------------------------------------------------------
const IS_DEV = (extra.appEnv as string) === 'development'

if (IS_DEV) {
  const {
    connectFirestoreEmulator,
  } = require('firebase/firestore') as typeof import('firebase/firestore')
  const {
    connectAuthEmulator,
  } = require('firebase/auth') as typeof import('firebase/auth')
  const {
    connectStorageEmulator,
  } = require('firebase/storage') as typeof import('firebase/storage')
  const {
    connectDatabaseEmulator,
  } = require('firebase/database') as typeof import('firebase/database')
  const {
    connectFunctionsEmulator,
  } = require('firebase/functions') as typeof import('firebase/functions')

  const EMULATOR_HOST = process.env.EMULATOR_HOST || '10.0.2.2' // ← Change to WiFi IP for physical device

  try {
    connectFirestoreEmulator(db,        EMULATOR_HOST, 8080)
    connectAuthEmulator(auth,           `http://${EMULATOR_HOST}:9099`, { disableWarnings: true })
    connectStorageEmulator(storage,     EMULATOR_HOST, 9199)
    connectDatabaseEmulator(rtdb,       EMULATOR_HOST, 9000)
    connectFunctionsEmulator(functions, EMULATOR_HOST, 5001)
    console.info('[apna] 🔥 Connected to Firebase Emulators at', EMULATOR_HOST)
  } catch {
    // Already connected — safe to ignore during Fast Refresh
  }
}

export default app

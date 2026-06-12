// app.config.ts (project root — replaces app.json)
const config: any = {
  name: 'apna',
  slug: 'apna',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',     // Default dark — matches PRD §7
  splash: {
    backgroundColor: '#080C14',   // DarkColors.bgPrimary — no flash
    resizeMode: 'contain',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#080C14',
    },
    package: 'com.apna.app',
    googleServicesFile: './google-services.json',
    // Required for phone auth on Android
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'apna' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  // Memory reel (Prompt 4.4): ffmpeg-kit-react-native requires a dev/EAS build.
  // Expo Go does not include native FFmpeg — use: npx expo run:android or EAS Build.
  plugins: [
    'expo-font',
    'expo-haptics',
    'expo-blur',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,      // Android 8.0 — 99%+ of 2026 Indian devices
          targetSdkVersion: 35,   // Android 15
          compileSdkVersion: 35,
        },
      },
    ],
  ],
  extra: {
    // Firebase — loaded from .env via process.env
    firebaseApiKey:           process.env.FIREBASE_API_KEY,
    firebaseAuthDomain:       process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId:        process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket:    process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId:            process.env.FIREBASE_APP_ID,

    // Observability
    sentryDsn:  process.env.SENTRY_DSN,
    postHogKey: process.env.POSTHOG_API_KEY,

    // Mapbox — Phase 3
    mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  },
}

export default config

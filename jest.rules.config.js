/**
 * Firestore security-rules test config.
 * Run via: npm run test:rules  (wraps jest in `firebase emulators:exec`)
 * These tests need the Firestore emulator — they are excluded from `npx jest`.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/rules/**/*.test.ts'],
  testTimeout: 20000,
}

/** Jest config for Cloud Functions unit tests (pure-logic modules). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Keep the compiled output out of test discovery
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
}

/** Client app jest config. Cloud Functions have their own suite (functions/jest.config.js). */
module.exports = {
  // tests/rules needs the Firestore emulator — run via `npm run test:rules`.
  // .claude/worktrees holds transient agent worktree checkouts — never part of the suite.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/functions/',
    '/coverage/',
    '/tests/rules/',
    '/.claude/worktrees/',
  ],
  // Coverage is measured against real source only, not tests or transient checkouts.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.claude/worktrees/'],
  // Regression gate for the money path — the pure business logic that must never
  // silently lose coverage. Enforced by `npm run test:coverage` (CI). Thresholds
  // sit just below current levels so a real drop fails the build.
  coverageThreshold: {
    // Directory key = aggregate across the whole money-path module.
    './src/lib/budget/': { statements: 90, branches: 84, functions: 92, lines: 92 },
    // Single-file gate for the split calculator (paise-exact arithmetic).
    './src/lib/engine/splitEngine.ts': { statements: 95, branches: 85, functions: 90, lines: 95 },
  },
}

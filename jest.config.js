/** Client app jest config. Cloud Functions have their own suite (functions/jest.config.js). */
module.exports = {
  // tests/rules needs the Firestore emulator — run via `npm run test:rules`
  testPathIgnorePatterns: ['/node_modules/', '/functions/', '/coverage/', '/tests/rules/'],
}

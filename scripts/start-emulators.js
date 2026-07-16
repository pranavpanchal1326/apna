// scripts/start-emulators.js
// Starts the full Firebase emulator suite (auth, firestore, database,
// functions, storage) with the JDK-21 Windows temp-path fix — see
// scripts/test-rules.js for why JAVA_TOOL_OPTIONS is overridden.
//
// Usage: npm run emulators

const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

let tmpDir = os.tmpdir()
if (process.platform === 'win32') {
  tmpDir = 'C:\\tmp'
  fs.mkdirSync(tmpDir, { recursive: true })
}

const env = {
  ...process.env,
  JAVA_TOOL_OPTIONS: [
    process.env.JAVA_TOOL_OPTIONS,
    `-Djdk.net.unixdomain.tmpdir=${tmpDir}`,
    `-Djava.io.tmpdir=${tmpDir}`,
  ]
    .filter(Boolean)
    .join(' '),
}

const result = spawnSync('npx', ['firebase', 'emulators:start'], {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: path.resolve(__dirname, '..'),
})

process.exit(result.status ?? 0)

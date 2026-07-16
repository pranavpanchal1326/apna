// scripts/test-rules.js
// Runs the Firestore rules tests against the emulator.
//
// WHY THIS WRAPPER EXISTS: JDK 21 on Windows creates AF_UNIX selector sockets
// in %TEMP%. When the Windows username contains a space (e.g. "Pranav
// Panchal"), socket creation fails with "Invalid argument: connect" and the
// emulator dies on startup. We point Java's temp dirs at a space-free path.

const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

// Spaces AND long paths both break AF_UNIX sun_path — always use a short
// stable dir on Windows rather than trusting %TEMP%.
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

const result = spawnSync(
  'npx',
  [
    'firebase',
    'emulators:exec',
    '--only',
    'firestore',
    '--project',
    'demo-apna-rules',
    // Extra quotes survive the Windows shell so firebase receives ONE script
    // string — without them it runs bare `jest` (the full app suite).
    '"jest -c jest.rules.config.js"',
  ],
  { stdio: 'inherit', env, shell: true, cwd: path.resolve(__dirname, '..') },
)

process.exit(result.status ?? 1)

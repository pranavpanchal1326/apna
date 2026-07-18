#!/usr/bin/env node
// scripts/lint-design.js
// Kora & Ink design-system lint — Blueprint Phase 1 step 4 (§1.3 banlist).
// Enforced in CI: `npm run lint:design`
//
// Rules:
//   1. No raw hex colors outside src/theme/ (tokens are the only color source).
//   2. No emoji in JSX chrome — emoji survive only as user content
//      (allowlisted props/files below).
//   3. No text-glyph controls (←, ×, ⋯, ›) in JSX text.
//
// Exit code 1 on any violation, with file:line output.

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

// ── Allowlists ────────────────────────────────────────────────────────
// Files allowed to contain raw hex (tokens, static export artifacts, data).
const HEX_ALLOW = [
  /^theme[\\/]/,                        // the token source of truth
  /^components[\\/]icons[\\/]/,         // brand glyphs — currentColor defaults
  /^components[\\/]ui[\\/]DhagaLogo\.tsx$/, // brand mark — fixed chalk/ink knot (§7.3)
  /^lib[\\/]types[\\/]user\.types\.ts$/,   // persisted avatar ramp
  /^lib[\\/]schemas[\\/]user\.schema\.ts$/,
  /^scripts[\\/]/,                      // seed data
  /^components[\\/]recap[\\/]PublicRecapCard\.tsx$/, // kora-always export artifact (§3.17)
  /^components[\\/]reel[\\/]ReelOverlayFrame\.tsx$/, // kora-always export artifact
  /^screens[\\/]tripWrap[\\/]components[\\/]TripWrapCard\.tsx$/, // fixed-palette export card (§3.17)
  /^native[\\/]/,                       // Android widget resources (mirrored tokens)
  /^lib[\\/]utils[\\/]exportPdf\.ts$/,     // static HTML artifact
  /\.test\.tsx?$/,                      // tests assert data, not chrome
  /__tests__/,
  /^tests[\\/]/,
]

// Files allowed to contain emoji literals (user-content pickers & data).
const EMOJI_ALLOW = [
  /EmojiPicker/i,
  /^lib[\\/]/,
  /^scripts[\\/]/,
  /\.test\.tsx?$/,
  /__tests__/,
]

// Lines dealing with emoji as user content (group cover emoji, reactions,
// picker output) are exempt — §2.5.2 permits group emoji inside neutral tiles.
const EMOJI_PROP_LINE = /emoji|reaction/i

const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u
const GLYPH_RE = /<Text[^>]*>[^<]*(←|→|✕|⋯|›|‹)[^<]*<\/Text>|['"`](←|✕|⋯)['"`]/

const failures = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry.name)) lint(full)
  }
}

function lint(file) {
  const rel = path.relative(SRC, file)
  const lines = fs.readFileSync(file, 'utf8').split('\n')

  const hexAllowed = HEX_ALLOW.some((re) => re.test(rel))
  const emojiAllowed = EMOJI_ALLOW.some((re) => re.test(rel))

  lines.forEach((line, i) => {
    const loc = `src/${rel.replace(/\\/g, '/')}:${i + 1}`
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return

    if (!hexAllowed && HEX_RE.test(line)) {
      failures.push(`${loc}  raw hex — use useTheme() tokens (Blueprint §2.1)`)
    }
    HEX_RE.lastIndex = 0

    if (!emojiAllowed && !EMOJI_PROP_LINE.test(line) && EMOJI_RE.test(line)) {
      failures.push(`${loc}  emoji in chrome — use the icon set (Blueprint §2.5)`)
    }

    if (GLYPH_RE.test(line)) {
      failures.push(`${loc}  text-glyph control — use Phosphor icons (Appendix B)`)
    }
  })
}

walk(SRC)

if (failures.length) {
  console.error(`\nKora & Ink design lint — ${failures.length} violation(s):\n`)
  for (const f of failures) console.error('  ✗ ' + f)
  console.error('\nSee docs/DESIGN_BLUEPRINT.md §1.3 for the banlist.\n')
  process.exit(1)
} else {
  console.log('Kora & Ink design lint — clean.')
}

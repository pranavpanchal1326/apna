#!/usr/bin/env node
/**
 * Export the Kora & Ink SVG mockups in docs/screens/ to PNG.
 *
 * Used for GitHub's social-preview slot (PNG/JPG only) and for anywhere an
 * SVG won't render (app-store listings, decks, README hosts without SVG).
 *
 * Prerequisite (not a runtime dep — install on demand):
 *   npm i -D sharp
 *
 * Usage:
 *   node scripts/export-screens.js            # 2x scale, all screens
 *   node scripts/export-screens.js --scale 3  # 3x scale
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error(
    'Missing "sharp". Install it first:\n\n  npm i -D sharp\n\n' +
      'Then re-run: node scripts/export-screens.js'
  );
  process.exit(1);
}

const scaleArg = process.argv.indexOf('--scale');
const scale = scaleArg !== -1 ? Number(process.argv[scaleArg + 1]) || 2 : 2;

const dir = path.join(__dirname, '..', 'docs', 'screens');
const outDir = path.join(dir, 'png');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
if (files.length === 0) {
  console.error(`No .svg files found in ${dir}`);
  process.exit(1);
}

(async () => {
  for (const file of files) {
    const src = path.join(dir, file);
    const out = path.join(outDir, file.replace(/\.svg$/, '.png'));
    await sharp(src, { density: 72 * scale })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  ${file}  ->  png/${path.basename(out)}  (${scale}x)`);
  }
  console.log(`\nDone. ${files.length} file(s) exported to docs/screens/png/`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Typecheck with a baseline error budget.
 *
 * Runs `tsc --noEmit` and fails ONLY if the number of TypeScript errors grows
 * beyond the committed baseline stored in `.tsc-baseline.txt` (currently 79
 * pre-existing errors). This keeps CI green while legacy type debt is paid
 * down, while still catching regressions that ADD new errors.
 *
 * Usage:
 *   node scripts/typecheck-baseline.js            # check against baseline
 *   node scripts/typecheck-baseline.js --update   # accept current count as new baseline
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(APP_ROOT, '.tsc-baseline.txt');
const TSC_BIN = path.join(APP_ROOT, 'node_modules', '.bin', 'tsc');

function currentErrorCount() {
  let out = '';
  try {
    out = execFileSync(TSC_BIN, ['--noEmit', '--pretty', 'false'], {
      cwd: APP_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // tsc exits non-zero when errors exist; the report is still on stdout/stderr.
    out = `${err.stdout || ''}${err.stderr || ''}`;
  }
  return (out.match(/error TS\d+/g) || []).length;
}

const count = currentErrorCount();

if (!fs.existsSync(BASELINE_FILE)) {
  if (process.env.CI) {
    console.error(
      `❌ Typecheck baseline file missing: ${BASELINE_FILE}.\n` +
        '   The baseline must be committed to the repo so CI can detect new type errors.\n' +
        '   Run locally (no CI env): node scripts/typecheck-baseline.js  → then commit the file.',
    );
    process.exit(1);
  }
  fs.writeFileSync(BASELINE_FILE, `${count}\n`);
  console.log(`ℹ️  No baseline found — wrote current count (${count}) to ${BASELINE_FILE}`);
  process.exit(0);
}

const baseline = parseInt(fs.readFileSync(BASELINE_FILE, 'utf8').trim() || '0', 10);

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE_FILE, `${count}\n`);
  console.log(`✅ Baseline updated to ${count} error(s).`);
  process.exit(0);
}

if (count > baseline) {
  console.error(
    `❌ Typecheck failed: ${count} error(s) — up from baseline ${baseline}.`,
  );
  console.error(
    '   New type errors were introduced. Fix them, or explicitly accept the new baseline with:\n' +
      '   node scripts/typecheck-baseline.js --update',
  );
  process.exit(1);
}

console.log(
  count === baseline
    ? `✅ Typecheck: ${count} error(s) — at baseline.`
    : `✅ Typecheck: ${count} error(s) — under baseline ${baseline}.`,
);

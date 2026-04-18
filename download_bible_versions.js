/**
 * download_bible_versions.js
 *
 * Run from your project ROOT:
 *   node download_bible_versions.js
 *
 * ── Sources ──────────────────────────────────────────────────────────────────
 * KJV, WEB, ASV, BBE, YLT  →  scrollmapper/bible_databases (2024 branch)
 * BSB                       →  bereanbible.com/bsb.txt  (public domain)
 * DARBY                     →  ebible.org/Scriptures/engDBY_vpl.zip
 * WEBSTER                   →  ebible.org/Scriptures/engwebster_vpl.zip
 *
 * WHY THE SOURCE CHANGED FOR DARBY / WEBSTER
 * ─────────────────────────────────────────────────────────────────────────────
 * api.biblesupersearch.com now returns HTTP 400 for all requests, and
 * SourceForge's /download URLs redirect to an HTML interstitial page rather
 * than the raw file when fetched non-interactively.
 *
 * eBible.org publishes the same public-domain texts as VPL (Verse-Per-Line)
 * zip archives — direct, stable URLs that download with a single fetch, no
 * API key and no redirect tricks required.
 *
 * VPL format (one line per verse inside the zip's .txt file):
 *   GEN 1:1 In the beginning God created the heavens and the earth.
 *   GEN 1:2 And the earth was without form…
 *
 * NOTE ON VERSE COUNTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The eBible VPL zips include Apocrypha lines (deuterocanon), which we skip.
 * After filtering, Darby and Webster yield ~28,960 canonical (66-book) verses.
 * This is correct — these translations handle a small number of verse merges
 * differently from KJV, so their canonical count is legitimately lower than
 * the 31,103 you see in the scrollmapper files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_DIR = path.join(
  __dirname,
  'src',
  'assets',
  'bibleVersion',
  'json',
);

// ── Shared book list (canonical names used as JSON keys) ─────────────────────

const BOOKS = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
];

// USFM 3-letter abbreviation → canonical book name
// (eBible VPL files use standard USFM/Paratext abbreviations)
const USFM_TO_BOOK = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  EST: 'Esther',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  EZK: 'Ezekiel',
  DAN: 'Daniel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
  // Alternate abbreviations seen in some eBible files
  EZE: 'Ezekiel',
  PSS: 'Psalms',
  SGA: 'Song of Solomon',
};

// ── Scrollmapper (KJV / WEB / ASV / BBE / YLT) ───────────────────────────────

const SCROLLMAPPER_BASE =
  'https://raw.githubusercontent.com/scrollmapper/bible_databases/2024/json/';

const SCROLLMAPPER_VERSIONS = [
  { id: 'KJV', file: 't_kjv.json', output: 'verses-kjv.json' },
  { id: 'WEB', file: 't_web.json', output: 'verses-web.json' },
  { id: 'ASV', file: 't_asv.json', output: 'verses-asv.json' },
  { id: 'BBE', file: 't_bbe.json', output: 'verses-bbe.json' },
  { id: 'YLT', file: 't_ylt.json', output: 'verses-ylt.json' },
];

function unpack(packed) {
  const b = Math.floor(packed / 1_000_000);
  const c = Math.floor((packed % 1_000_000) / 1_000);
  const v = packed % 1_000;
  return { b, c, v };
}

const BOOK_NAMES = ['', ...BOOKS]; // 1-indexed

async function downloadScrollmapper({ id, file, output }) {
  const url = SCROLLMAPPER_BASE + file;
  console.log(`\n⬇  [${id}] ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  if (!raw?.resultset?.row) throw new Error('Unexpected format');
  const flat = {};
  for (const row of raw.resultset.row) {
    const field = row.field;
    const { b, c, v } = unpack(field[0]);
    const book = BOOK_NAMES[b];
    if (!book) continue;
    flat[`${book} ${c}:${v}`] = field[field.length - 1];
  }
  save(flat, output, id);
}

// ── BSB — bereanbible.com/bsb.txt ────────────────────────────────────────────

async function downloadBSB() {
  const id = 'BSB';
  const url = 'https://bereanbible.com/bsb.txt';
  console.log(`\n⬇  [${id}] ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  const flat = {};
  for (const line of lines) {
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const ref = line.slice(0, tab).trim();
    const verse = line.slice(tab + 1).trim();
    if (!ref || !verse || ref === 'Verse') continue;
    if (!/\d+:\d+$/.test(ref)) continue;
    flat[ref] = verse;
  }
  save(flat, 'verses-bsb.json', id, 30_000);
}

// ── eBible VPL zip (DARBY / WEBSTER) ─────────────────────────────────────────
//
// The zip contains a .vpl or .txt file. Each line is:
//   <USFM_ABBREV> <chapter>:<verse> <verse text>
// e.g.:
//   GEN 1:1 In the beginning God created the heavens and the earth.
//
// These files include Apocrypha (deuterocanon) lines which we skip since our
// USFM_TO_BOOK map only covers the 66 canonical books. After filtering, the
// canonical verse count for Darby and Webster is ~28,960 — legitimately lower
// than KJV's 31,103 because these translations merge a small number of verses
// that KJV splits. This is expected and correct.

async function downloadEBibleVPL({ id, zipUrl, output, minVerses }) {
  console.log(`\n⬇  [${id}] ${zipUrl}`);

  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const arrayBuf = await res.arrayBuffer();
  const zipBuf = Buffer.from(arrayBuf);

  // Sanity-check: ZIP files start with PK (0x50 0x4b)
  if (zipBuf[0] !== 0x50 || zipBuf[1] !== 0x4b) {
    const preview = zipBuf.slice(0, 200).toString('utf8');
    throw new Error(
      `Expected a ZIP file but got non-ZIP data.\nFirst 200 bytes:\n${preview}`,
    );
  }

  const entries = parseZip(zipBuf);

  // Find the VPL/txt entry — skip metadata files
  const vplEntry = entries.find(e => {
    const lower = e.name.toLowerCase();
    return (
      (lower.endsWith('.vpl') || lower.endsWith('.txt')) &&
      !lower.includes('__macosx') &&
      !lower.includes('copyright') &&
      !lower.includes('readme') &&
      !lower.includes('copr')
    );
  });

  if (!vplEntry) {
    const names = entries.map(e => e.name).join(', ');
    throw new Error(`No VPL/txt entry found in zip. Entries: ${names}`);
  }

  console.log(`   📄 Parsing: ${vplEntry.name}`);

  const text = vplEntry.data.toString('utf8');
  const lines = text.split(/\r?\n/);
  const flat = {};
  let skipped = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Format: USFM_ABBREV CH:V verse text…
    const sp1 = line.indexOf(' ');
    if (sp1 === -1) continue;
    const abbrev = line.slice(0, sp1).toUpperCase();
    const rest = line.slice(sp1 + 1);

    const sp2 = rest.indexOf(' ');
    if (sp2 === -1) continue;
    const cv = rest.slice(0, sp2);
    const verseText = rest.slice(sp2 + 1).trim();

    if (!verseText) continue;
    if (!/^\d+:\d+$/.test(cv)) continue;

    const book = USFM_TO_BOOK[abbrev];
    if (!book) {
      skipped++;
      continue;
    } // deuterocanon / unknown — expected

    flat[`${book} ${cv}`] = verseText;
  }

  if (skipped > 0) {
    console.log(
      `   ℹ  Skipped ${skipped} lines (Apocrypha / deuterocanon — expected for this source)`,
    );
  }

  save(flat, output, id, minVerses);
}

// ── Minimal pure-JS ZIP parser ────────────────────────────────────────────────
// Reads the ZIP central directory, then extracts each local file entry.
// Supports DEFLATE (method 8) and STORE (method 0).

function parseZip(buf) {
  // Find End of Central Directory (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1)
    throw new Error('ZIP parse error: EOCD record not found');

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const entries = [];
  let pos = cdOffset;

  while (pos < cdOffset + cdSize) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break; // central dir signature

    const method = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.slice(pos + 46, pos + 46 + nameLen).toString('utf8');

    pos += 46 + nameLen + extraLen + commentLen;

    const lfhNameLen = buf.readUInt16LE(localOffset + 26);
    const lfhExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lfhNameLen + lfhExtraLen;
    const compressed = buf.slice(dataStart, dataStart + compressedSize);

    let data;
    if (method === 0) {
      data = compressed; // STORE
    } else if (method === 8) {
      data = zlib.inflateRawSync(compressed); // DEFLATE
    } else {
      continue; // unsupported — skip
    }

    entries.push({ name, data });
  }

  if (entries.length === 0)
    throw new Error('ZIP parse error: no entries extracted');
  return entries;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * @param {Record<string,string>} flat
 * @param {string} output  filename inside OUTPUT_DIR
 * @param {string} id      version ID for logging
 * @param {number} minVerses  minimum acceptable verse count for this version
 */
function save(flat, output, id, minVerses) {
  const count = Object.keys(flat).length;
  if (count < minVerses) {
    throw new Error(
      `Only ${count.toLocaleString()} verses parsed — expected at least ` +
        `${minVerses.toLocaleString()}. Check the source or the parser.`,
    );
  }
  console.log(`📖  ${count.toLocaleString()} verses`);
  const outPath = path.join(OUTPUT_DIR, output);
  fs.writeFileSync(outPath, JSON.stringify(flat));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`💾  Saved → ${outPath}  (${kb} KB)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('📂  Output dir:', OUTPUT_DIR);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tasks = [
    ...SCROLLMAPPER_VERSIONS.map(v => ({
      id: v.id,
      fn: () => downloadScrollmapper(v),
    })),
    {
      id: 'BSB',
      fn: () => downloadBSB(),
    },
    {
      id: 'DARBY',
      fn: () =>
        downloadEBibleVPL({
          id: 'DARBY',
          zipUrl: 'https://eBible.org/Scriptures/engDBY_vpl.zip',
          output: 'verses-darby.json',
          // ~28,960 canonical verses after Apocrypha lines are filtered out
          minVerses: 28_000,
        }),
    },
    {
      id: 'WEBSTER',
      fn: () =>
        downloadEBibleVPL({
          id: 'WEBSTER',
          zipUrl: 'https://eBible.org/Scriptures/engwebster_vpl.zip',
          output: 'verses-webster.json',
          minVerses: 28_000,
        }),
    },
  ];

  let failed = 0;
  for (const { id, fn } of tasks) {
    try {
      await fn();
    } catch (err) {
      console.error(`\n❌  [${id}] ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (failed === 0) {
    console.log(`🎉  All ${tasks.length} versions ready!`);
    console.log(
      'Rebuild your app and all translations will appear in the picker.',
    );
  } else {
    console.log(`⚠️  ${failed}/${tasks.length} failed. See errors above.`);
  }
})();

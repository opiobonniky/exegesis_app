/**
 * bibleVersions.ts
 *
 * Registry of free / public-domain Bible versions bundled with the app.
 * Each version ships as a JSON file with keys:
 *
 *   "<Book> <chapter>:<verse>"  →  "<verse text>"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVAILABLE FROM scrollmapper/bible_databases (2024 branch) – all 5 below
 * Run `node download_bible_versions.js` to fetch them.
 *
 * HOW TO ADD A CUSTOM VERSION (e.g. Darby, BSB, ESV)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Get the Bible text from a public-domain or permissive-license source.
 * 2. Convert it to the flat JSON format:
 *      { "Genesis 1:1": "In the beginning...", "Genesis 1:2": "...", ... }
 * 3. Save it as  src/assets/bibleVersion/json/verses-<n>.json
 * 4. Add an entry below — the app picks it up automatically.
 *
 * Useful free sources:
 *   • Berean Standard Bible (CC BY 4.0): https://berean.bible/downloads.htm
 *   • eBible.org (many languages):       https://ebible.org/find/
 *   • Crosswire SWORD modules:           https://crosswire.org/sword/modules/
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BibleVersion {
  /** Short identifier stored in AsyncStorage / state */
  id: string;
  /** Human-readable name shown in the UI */
  name: string;
  /** 1–4 letter abbreviation badge shown next to chapter/verse references */
  abbreviation: string;
  /** One-sentence description shown in the picker */
  description: string;
  /** Year of publication / translation */
  year: number;
  /** Lazy-require function – keeps only the active version in memory */
  load: () => Record<string, string>;
}

/**
 * All bundled free versions, ordered by popularity.
 *
 * Lazy `require()` calls ensure React Native's Metro bundler includes each
 * JSON in the bundle but only parses/holds the selected version in JS memory.
 */
export const BIBLE_VERSIONS: BibleVersion[] = [
  // 1. BSB — default; fast-growing modern translation, highly accurate
  {
    id: 'BSB',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    description:
      'A 2022 revision combining readability with accuracy (CC BY 4.0).',
    year: 2022,
    load: () => require('../json/verses-bsb.json'),
  },
  // 2. KJV — most historically beloved and widely memorised English Bible
  {
    id: 'KJV',
    name: 'King James Version',
    abbreviation: 'KJV',
    description: 'The classic 1769 authorised English translation.',
    year: 1769,
    load: () => require('../json/verses-kjv.json'),
  },
  // 3. WEB — modern public-domain translation for contemporary readers
  {
    id: 'WEB',
    name: 'World English Bible',
    abbreviation: 'WEB',
    description: 'A modern public-domain translation in contemporary English.',
    year: 2000,
    load: () => require('../json/verses-web.json'),
  },
  // 4. ASV — respected scholarly revision, foundation for many later versions
  {
    id: 'ASV',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    description: 'The 1901 American revision of the KJV.',
    year: 1901,
    load: () => require('../json/verses-asv.json'),
  },
  // 5. YLT — beloved by word-for-word study readers
  {
    id: 'YLT',
    name: "Young's Literal Translation",
    abbreviation: 'YLT',
    description:
      "Robert Young's highly literal 1862 word-for-word translation.",
    year: 1862,
    load: () => require('../json/verses-ylt.json'),
  },
  // 6. DARBY — popular with Plymouth Brethren and prophecy/dispensation students
  {
    id: 'DARBY',
    name: 'Darby Translation',
    abbreviation: 'DBY',
    description:
      "J. N. Darby's precise 1890 literal translation from Hebrew and Greek.",
    year: 1890,
    load: () => require('../json/verses-darby.json'),
  },
  // 7. WEBSTER — Noah Webster's KJV revision with modernised vocabulary
  {
    id: 'WEBSTER',
    name: 'Webster Bible',
    abbreviation: 'WBS',
    description:
      "Noah Webster's 1833 revision of the KJV with modernised language.",
    year: 1833,
    load: () => require('../json/verses-webster.json'),
  },
  // 8. BBE — simple ~1 000-word vocabulary; great for new readers and ESL
  {
    id: 'BBE',
    name: 'Bible in Basic English',
    abbreviation: 'BBE',
    description: 'Uses a vocabulary of ~1 000 common words for clarity.',
    year: 1949,
    load: () => require('../json/verses-bbe.json'),
  },
];

/** Default version id used on first launch */
export const DEFAULT_VERSION_ID = 'BSB';

/** Look up a version by id (falls back to BSB if unknown) */
export const getVersionById = (id: string): BibleVersion =>
  BIBLE_VERSIONS.find(v => v.id === id) ??
  BIBLE_VERSIONS.find(v => v.id === DEFAULT_VERSION_ID)!;

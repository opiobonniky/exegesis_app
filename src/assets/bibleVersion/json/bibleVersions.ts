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
    id: 'Berean',
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
export const DEFAULT_VERSION_ID = 'Berean';

/** Online-only translations (not in local bundle, fetched from backend) */
const ONLINE_ONLY_TRANSLATIONS: Record<string, Omit<BibleVersion, 'load'>> = {
  NIV: { id: 'NIV', name: 'New International Version', abbreviation: 'NIV', description: 'Modern English translation', year: 2011 },
  ESV: { id: 'ESV', name: 'English Standard Version', abbreviation: 'ESV', description: 'ESV Bible', year: 2016 },
  NASB: { id: 'NASB', name: 'New American Standard Bible', abbreviation: 'NASB', description: 'NASB', year: 1995 },
  NLT: { id: 'NLT', name: 'New Living Translation', abbreviation: 'NLT', description: 'NLT', year: 2004 },
  NKJ: { id: 'NKJ', name: 'New King James Version', abbreviation: 'NKJ', description: 'NKJV', year: 1982 },
  CSB: { id: 'CSB', name: 'Christian Standard Bible', abbreviation: 'CSB', description: 'CSB', year: 2017 },
  GNT: { id: 'GNT', name: 'Good News Translation', abbreviation: 'GNT', description: 'GNT', year: 1992 },
  NIRV: { id: 'NIRV', name: "New International Reader's Version", abbreviation: 'NIRV', description: 'NIRV', year: 1996 },
  RSV: { id: 'RSV', name: 'Revised Standard Version', abbreviation: 'RSV', description: 'RSV', year: 1971 },
  NRSV: { id: 'NRSV', name: 'New Revised Standard Version', abbreviation: 'NRSV', description: 'NRSV', year: 1989 },
  NET: { id: 'NET', name: 'NET Bible', abbreviation: 'NET', description: 'NET', year: 2005 },
  MEV: { id: 'MEV', name: 'Modern English Version', abbreviation: 'MEV', description: 'MEV', year: 2014 },
  LSB: { id: 'LSB', name: 'Legacy Standard Bible', abbreviation: 'LSB', description: 'LSB', year: 2021 },
  NASU: { id: 'NASU', name: 'New American Standard Update', abbreviation: 'NASU', description: 'NASU', year: 1989 },
  AmplifiedClassic: { id: 'AmplifiedClassic', name: 'Amplified Classic', abbreviation: 'AMPClassic', description: 'Amplified Classic', year: 1987 },
  Passion: { id: 'Passion', name: 'The Passion Translation', abbreviation: 'TPT', description: 'The Passion Translation', year: 2020 },
  ERV: { id: 'ERV', name: 'English Revised Version', abbreviation: 'ERV', description: 'ERV', year: 2006 },
  HCSB: { id: 'HCSB', name: 'Holman Christian Standard', abbreviation: 'HCSB', description: 'HCSB', year: 2004 },
};

/** Look up a version by id (falls back to Berean if unknown) */
export const getVersionById = (id: string): BibleVersion => {
  const local = BIBLE_VERSIONS.find(v => v.id === id);
  if (local) return local;

  const online = ONLINE_ONLY_TRANSLATIONS[id];
  if (online) {
    return {
      ...online,
      load: () => ({}),
    };
  }

  return BIBLE_VERSIONS.find(v => v.id === DEFAULT_VERSION_ID)!;
};

/** Check if a translation is available locally (offline) */
export const isLocalTranslation = (id: string): boolean => {
  return BIBLE_VERSIONS.some(v => v.id === id);
};

/** Check if a translation is available only online */
export const isOnlineOnlyTranslation = (id: string): boolean => {
  return !!ONLINE_ONLY_TRANSLATIONS[id];
};

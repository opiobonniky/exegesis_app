const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  'src',
  'assets',
  'bibleVersion',
  'json',
  'verses-web.json',
);

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let changed = 0;
const result = {};

for (const [key, text] of Object.entries(data)) {
  const clean = text.replaceAll('\\"', '"'); // remove backslash, keep the quote
  if (clean !== text) changed++;
  result[key] = clean;
}

fs.writeFileSync(FILE, JSON.stringify(result));
console.log(`✅  Cleaned ${changed.toLocaleString()} verses`);
console.log(`\nSample Genesis 1:3:\n   ${result['Genesis 1:3']}`);

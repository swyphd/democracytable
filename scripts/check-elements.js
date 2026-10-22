#!/usr/bin/env node
// Validates elements.json and checks it still matches the E array in index.html.
// Run with: node scripts/check-elements.js
// Exits 1 on errors. Warnings are printed but do not fail the check.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const COUNT = 118;
const FAMILIES = ['info', 'delib', 'elect', 'direct', 'acct', 'org', 'adv', 'gov', 'econ'];
const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10]; // 9 and 10 are the detached rows
const FIELDS = { z: 'int', s: 'string', n: 'string', d: 'string', t: 'string', r: 'int', c: 'int', f: 'string' };

// --- elements.json on its own ---

let elements;
try {
  elements = JSON.parse(fs.readFileSync(path.join(root, 'elements.json'), 'utf8'));
} catch (e) {
  console.error(`elements.json could not be parsed: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(elements)) {
  console.error('elements.json must be an array');
  process.exit(1);
}
if (elements.length !== COUNT) err(`expected ${COUNT} elements, found ${elements.length}`);

const label = (e, i) => `element #${i + 1}${e && e.z != null ? ` (z=${e.z}${e.n ? ` ${e.n}` : ''})` : ''}`;
const seen = { z: new Map(), s: new Map(), n: new Map(), pos: new Map() };
const noteDup = (kind, key, who, report) => {
  if (seen[kind].has(key)) report(`duplicate ${{ z: 'number', s: 'symbol', n: 'name', pos: 'position' }[kind]} ${JSON.stringify(key)}: ${seen[kind].get(key)} and ${who}`);
  else seen[kind].set(key, who);
};

elements.forEach((e, i) => {
  const who = label(e, i);
  if (!e || typeof e !== 'object' || Array.isArray(e)) return err(`${who} is not an object`);

  for (const [k, type] of Object.entries(FIELDS)) {
    const v = e[k];
    if (v === undefined || v === null) err(`${who} is missing "${k}"`);
    else if (type === 'int' && !Number.isInteger(v)) err(`${who} "${k}" must be an integer, got ${JSON.stringify(v)}`);
    else if (type === 'string' && (typeof v !== 'string' || !v.trim())) err(`${who} "${k}" must be a non-empty string`);
  }
  for (const k of Object.keys(e)) if (!(k in FIELDS)) warn(`${who} has unexpected field "${k}"`);

  if (Number.isInteger(e.z)) {
    if (e.z < 1 || e.z > COUNT) err(`${who} z must be 1–${COUNT}`);
    else if (e.z !== i + 1) warn(`${who} is out of order (at position ${i + 1})`);
    noteDup('z', e.z, who, err);
  }
  if (typeof e.s === 'string') {
    if (!/^[A-Z][a-z]?$/.test(e.s)) err(`${who} symbol ${JSON.stringify(e.s)} should be one capital letter plus an optional lowercase letter`);
    noteDup('s', e.s, who, warn);
  }
  if (typeof e.n === 'string') noteDup('n', e.n.trim().toLowerCase(), who, err);
  if (typeof e.f === 'string' && !FAMILIES.includes(e.f)) err(`${who} family ${JSON.stringify(e.f)} is not one of ${FAMILIES.join(', ')}`);
  if (Number.isInteger(e.r) && !ROWS.includes(e.r)) err(`${who} row ${e.r} is not one of ${ROWS.join(', ')}`);
  if (Number.isInteger(e.c) && (e.c < 1 || e.c > 18)) err(`${who} column ${e.c} must be 1–18`);
  if (Number.isInteger(e.r) && Number.isInteger(e.c)) noteDup('pos', `${e.r},${e.c}`, who, err);
});

// --- elements.json vs index.html ---

try {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const grab = (re, what) => {
    const m = html.match(re);
    if (!m) throw new Error(`could not find ${what} in index.html`);
    return m[0];
  };
  const src = [
    grab(/const E = \[[\s\S]*?\n\];/, 'the E array'),
    grab(/function pos\(z\)\{[\s\S]*?\n\}/, 'pos()'),
    grab(/function fam\(r,c\)\{[\s\S]*?\n\}/, 'fam()'),
    'this.result = E.map(([z,s,n,d,t]) => { const [r,c] = pos(z); return {z,s,n,d,t,r,c,f:fam(r,c)}; });',
  ].join('\n');
  const ctx = {};
  vm.runInNewContext(src, ctx);
  const fromHtml = new Map(ctx.result.map((e) => [e.z, e]));

  if (fromHtml.size !== elements.length) err(`index.html has ${fromHtml.size} elements, elements.json has ${elements.length}`);
  for (const e of elements) {
    const h = fromHtml.get(e.z);
    if (!h) { err(`z=${e.z} is in elements.json but not in index.html`); continue; }
    for (const k of Object.keys(FIELDS)) {
      if (h[k] !== e[k]) err(`z=${e.z} "${k}" differs: elements.json ${JSON.stringify(e[k])}, index.html ${JSON.stringify(h[k])}`);
    }
  }
  for (const z of fromHtml.keys()) if (!elements.some((e) => e.z === z)) err(`z=${z} is in index.html but not in elements.json`);
} catch (e) {
  err(`index.html comparison failed: ${e.message}`);
}

// --- report ---

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error: ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`elements.json OK: ${elements.length} elements, in sync with index.html (${warnings.length} warning(s))`);

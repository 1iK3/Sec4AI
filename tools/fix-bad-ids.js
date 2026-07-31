/**
 * Keep valid existing IDs unchanged; only regenerate the invalid ones.
 * Ensures no collisions.
 */
const fs = require('fs');

function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).slice(0, 10);
}

function cleanSlug(text, prefix) {
  const asciiWords = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(w => w.length > 2)
    .slice(0, 4)
    .join('-');
  const base = asciiWords || 'prompt';
  const slug = (prefix + '-' + base).replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return (slug.length > 60 ? slug.slice(0, 60).replace(/-+$/, '') : slug);
}

const d = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));
const used = new Set();
let fixed = 0;

// First pass: collect all valid IDs
d.forEach(p => {
  if (/^[a-z0-9-]+$/.test(p.id)) used.add(p.id);
});

// Second pass: fix invalid IDs
d.forEach(p => {
  if (/^[a-z0-9-]+$/.test(p.id)) return; // keep valid
  const prefix = p.id.startsWith('gen-') ? 'gen' : p.id.startsWith('strat-') ? 'strat' : p.id.startsWith('cmplx-') ? 'cmplx' : 'pid';
  let id = `${cleanSlug(p.prompt, prefix)}-${hashString(p.prompt)}`;
  let n = 1;
  while (used.has(id)) { id = `${cleanSlug(p.prompt, prefix)}-${hashString(p.prompt + n)}`; n++; }
  used.add(id);
  p.id = id;
  fixed++;
});

const bad = d.filter(p => !/^[a-z0-9-]+$/.test(p.id));
const dup = d.length - new Set(d.map(p => p.id)).size;

fs.writeFileSync('data/prompts.json', JSON.stringify(d, null, 2), 'utf8');
console.log('Fixed IDs:', fixed);
console.log('Total:', d.length, '| Invalid:', bad.length, '| Duplicates:', dup);

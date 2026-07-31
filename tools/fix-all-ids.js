/**
 * Regenerate ALL prompt IDs to be URL-safe ([a-z0-9-]).
 * Deterministic: same prompt -> same ID.
 * Reads data/prompts.json, rewrites IDs, writes back.
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
  // Keep only a-z 0-9 and spaces from the ASCII portion
  const asciiWords = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(w => w.length > 2)
    .slice(0, 4)
    .join('-');
  const base = asciiWords || 'prompt';
  const slug = (prefix + '-' + base).replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 60 ? slug.slice(0, 60).replace(/-+$/, '') : slug;
}

function makeId(p) {
  const prefix = p.id.startsWith('gen-') ? 'gen' : p.id.startsWith('strat-') ? 'strat' : p.id.startsWith('cmplx-') ? 'cmplx' : 'pid';
  const hash = hashString(p.prompt);
  // Deterministic readable ID: prefix + slug + hash for uniqueness
  return `${cleanSlug(p.prompt, prefix)}-${hash}`;
}

const d = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));
const used = new Set();
let collisions = 0;

d.forEach(p => {
  let id = makeId(p);
  let n = 1;
  while (used.has(id)) {
    id = makeId(p) + '-' + (n++);
  }
  used.add(id);
  if (id !== p.id) p.id = id;
});

// Validate
const bad = d.filter(p => !/^[a-z0-9-]+$/.test(p.id));
const dup = d.length - new Set(d.map(p => p.id)).size;

fs.writeFileSync('data/prompts.json', JSON.stringify(d, null, 2), 'utf8');
console.log('Total:', d.length);
console.log('Invalid chars:', bad.length);
console.log('Duplicate IDs:', dup);
console.log('Sample IDs:');
d.slice(0, 5).forEach(p => console.log('  ', p.id));

/**
 * Merge all prompt sources into data/prompts.json:
 * 1. Existing data/prompts.json (current collection)
 * 2. tools/gen-converted.json (converted from gen-part1 + gen-part2)
 * 3. tools/gen-composite.json (newly generated composite attacks)
 *
 * Deduplicates by normalized prompt text.
 */
const fs = require('fs');

const existing = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));
const converted = JSON.parse(fs.readFileSync('tools/gen-converted.json', 'utf8'));
const composite = JSON.parse(fs.readFileSync('tools/gen-composite.json', 'utf8'));

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.,;:!?"'\u201c\u201d]/g, '');
}

const seen = new Set();
const merged = [];

// Track existing IDs to avoid collisions
const usedIds = new Set(existing.map(p => p.id));

function addPrompt(p) {
  const norm = normalize(p.prompt);
  if (!norm || norm.length < 10) return false;
  // Exact match dedupe
  if (seen.has(norm)) return false;
  // Substring dedupe (avoid near-duplicates for long prompts)
  for (const s of seen) {
    if (s.length > 80 && norm.length > 80 && (s.includes(norm) || norm.includes(s))) {
      return false;
    }
  }
  seen.add(norm);
  usedIds.add(p.id);
  merged.push(p);
  return true;
}

let addedExisting = 0, addedConverted = 0, addedComposite = 0;

// 1. Existing (keep order, but dedupe against itself too)
for (const p of existing) {
  if (addPrompt(p)) addedExisting++;
}

// 2. Converted gen samples
for (const p of converted) {
  if (addPrompt(p)) addedConverted++;
}

// 3. New composite attacks
for (const p of composite) {
  // Ensure unique IDs for composite
  let id = p.id;
  let counter = 1;
  const base = id;
  while (usedIds.has(id)) { id = base + '-' + (counter++); }
  p.id = id;
  if (addPrompt(p)) addedComposite++;
}

console.log('Existing kept:', addedExisting);
console.log('Converted gen added:', addedConverted);
console.log('Composite added:', addedComposite);
console.log('TOTAL:', merged.length);

fs.writeFileSync('data/prompts.json', JSON.stringify(merged, null, 2), 'utf8');
console.log('Written to data/prompts.json');

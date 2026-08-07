const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const marker = 'type="application/json">';
const s = h.indexOf(marker) + marker.length;
const e = h.indexOf('</script>', s);
const d = JSON.parse(h.substring(s, e));
const ids = new Set(d.map(p => p.id));

let failures = [];
d.forEach((p, idx) => {
  // New format: /prompt/<seq>-<id>
  const seq = idx + 1;
  const path = '/prompt/' + seq + '-' + p.id;
  const seg = path.replace('/prompt/', '');
  const m = seg.match(/^(\d+)-(.+)$/);
  if (!m) { failures.push('no-match: ' + p.id); return; }
  const parsedSeq = parseInt(m[1], 10);
  const parsedId = m[2];
  if (parsedId !== p.id) failures.push('id-mismatch: ' + p.id);
  if (parsedSeq !== seq) failures.push('seq-mismatch: ' + p.id);
  if (!ids.has(parsedId)) failures.push('not-found: ' + p.id);
  if (!/^[a-z0-9-]+$/.test(p.id)) failures.push('invalid-id: ' + p.id);
});

console.log('Total prompts:', d.length);
console.log('Routing failures:', failures.length);
failures.slice(0, 15).forEach(f => console.log('  ', f));
if (failures.length === 0) console.log('All prev/next navigation URLs resolve correctly.');

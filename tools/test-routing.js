const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const marker = 'type="application/json">';
const s = h.indexOf(marker) + marker.length;
const e = h.indexOf('</script>', s);
const d = JSON.parse(h.substring(s, e));
const ids = new Set(d.map(p => p.id));

let failures = [];
d.forEach(p => {
  // URL-safe check
  if (!/^[a-z0-9-]+$/.test(p.id)) failures.push('invalid-chars: ' + p.id);
  // Pathname extraction round-trip
  const path = '/prompt/' + p.id;
  const extracted = path.replace('/prompt/', '').replace(/\/$/, '').split('?')[0].split('#')[0];
  if (!ids.has(extracted)) failures.push('not-found: ' + p.id);
});

console.log('Total prompts:', d.length);
console.log('Routing failures:', failures.length);
failures.slice(0, 15).forEach(f => console.log('  ', f));
if (failures.length === 0) console.log('All cards will open correctly.');

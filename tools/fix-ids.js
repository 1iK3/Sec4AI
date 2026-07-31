const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));
const counts = {};
d.forEach(x => { counts[x.id] = (counts[x.id] || 0) + 1; });
const used = new Set();
let fixed = 0;
d.forEach(x => {
  if (counts[x.id] > 1) {
    if (used.has(x.id)) {
      x.id = x.id + '-' + (++fixed);
      used.add(x.id);
    } else {
      used.add(x.id);
    }
  } else {
    used.add(x.id);
  }
});
fs.writeFileSync('data/prompts.json', JSON.stringify(d, null, 2), 'utf8');
console.log('Fixed duplicate IDs. Total:', d.length);

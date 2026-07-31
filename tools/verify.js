const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const marker = 'type="application/json">';
const s = h.indexOf(marker) + marker.length;
const e = h.indexOf('</script>', s);
try {
  const d = JSON.parse(h.substring(s, e));
  console.log('Embedded JSON valid:', d.length, 'prompts');
  console.log('app.js present:', h.includes('app.js'));
} catch (err) {
  console.log('ERROR:', err.message.substring(0, 120));
}

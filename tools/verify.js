const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
console.log('app.js:', h.includes('app.js'));
console.log('og:type:', h.includes('og:type'));
console.log('ld+json:', h.includes('ld+json'));
console.log('twitter:card:', h.includes('twitter:card'));
console.log('canonical:', h.includes('rel="canonical"'));
const marker = 'type="application/json">';
const s = h.indexOf(marker) + marker.length;
const e = h.indexOf('</script>', s);
try {
  const d = JSON.parse(h.substring(s, e));
  console.log('Embedded JSON valid:', d.length, 'prompts');
} catch (err) {
  console.log('JSON ERROR:', err.message.substring(0, 120));
}

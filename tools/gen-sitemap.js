/**
 * Generate public/sitemap.xml listing all prompt detail pages.
 * Usage: node tools/gen-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://sec4ai.vercel.app';
const prompts = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));

const today = new Date().toISOString().split('T')[0];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

let urls = [];
urls.push({
  loc: SITE_URL + '/',
  lastmod: today,
  changefreq: 'daily',
  priority: '1.0'
});

prompts.forEach((p, idx) => {
  const slug = (idx + 1) + '-' + p.id;
  urls.push({
    loc: SITE_URL + '/prompt/' + slug,
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.7'
  });
});

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u =>
    '  <url>\n' +
    '    <loc>' + escapeXml(u.loc) + '</loc>\n' +
    '    <lastmod>' + u.lastmod + '</lastmod>\n' +
    '    <changefreq>' + u.changefreq + '</changefreq>\n' +
    '    <priority>' + u.priority + '</priority>\n' +
    '  </url>'
  ).join('\n') +
  '\n</urlset>\n';

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(path.join('public', 'sitemap.xml'), xml, 'utf8');
console.log('Sitemap written with ' + urls.length + ' URLs');

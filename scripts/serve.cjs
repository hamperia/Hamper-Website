const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon', '.webp': 'image/webp' };

function handler(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const file = path.resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.stat(file, (error, stats) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    if (stats.isDirectory()) { res.writeHead(302, { Location: pathname + '/' }).end(); return; }
    res.writeHead(200, { 'Content-Type': `${mime[path.extname(file).toLowerCase()] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) http.createServer(handler).listen(port, '127.0.0.1', () => console.log(`Hamperia preview: http://127.0.0.1:${port}/`));
module.exports = { handler };

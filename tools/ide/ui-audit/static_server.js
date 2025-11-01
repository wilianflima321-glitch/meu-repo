const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const base = path.join(__dirname, 'test_site');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.join(base, p);
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404; res.end('Not found'); return;
    }
    const ext = path.extname(file);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(port, () => console.log(`Static test site listening on http://localhost:${port}`));

const http = require('http');
const url = require('url');

// Simple proxy shim used in CI to expose /ai-proxy and other paths on the
// Playwright baseURL (default http://127.0.0.1:8010) while forwarding the
// underlying implementation to a real mock backend running on TARGET_PORT
// (default 8011). This avoids requiring the full Theia server in CI.

const LISTEN_PORT = parseInt(process.env.PORT || process.env.LISTEN_PORT || '8010', 10);
const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '8011', 10);

function forwardRequest(clientReq, clientRes) {
  const parsed = url.parse(clientReq.url || '/');
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: parsed.path,
    method: clientReq.method,
    headers: Object.assign({}, clientReq.headers)
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
  });

  // Pipe request body
  clientReq.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  // If you want to special-case some endpoints (like a simple / for health)
  // you can handle them here. For now we forward everything to the target.
  forwardRequest(req, res);
});

server.listen(LISTEN_PORT, () => {
  console.log(`Proxy shim listening on http://127.0.0.1:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Lightweight CI mock server (no external deps)
// Serves both root endpoints and /api/llm prefixed endpoints so CI smoke/tests are stable.
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 8010;

function json(res, obj, code=200) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(s);
}

function handleApi(req, pathname, body) {
  // normalize path without leading slash
  const p = pathname.replace(/^\//, '');
  switch(p) {
    case 'health':
      return { code:200, body: { status: 'ok' , ok:true } };
    case 'auth/providers':
      return { code:200, body: ['anonymous','api-key'] };
    case 'billing/plans':
      return { code:200, body: [ { id:'free', name:'Free', price:0 } ] };
    case 'ai-runtime/chat':
      if (req.method !== 'POST') return { code:405, body: { error: 'method_not_allowed' } };
      return { code:200, body: { id:'mock-response', model:'mock:gpt', choices:[ { message: { role:'assistant', content:'pong' } } ] } };
    case 'ai-runtime/chat/stream':
      if (req.method !== 'POST') return { code:405, body: { error: 'method_not_allowed' } };
      // return a simple JSON that the smoke script treats as OK
      return { code:200, body: { stream: ['Hello','from','ci-mock'] } };
    case 'api/llm/auth/providers':
      return { code:200, body: ['anonymous','api-key'] };
    default:
      return null;
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = (parsed.pathname || '').replace(/\/+/g, '/').replace(/\/$/,'');

  // read body if any
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // route normalization: support both /foo and /api/llm/foo -> map to same handler
    let candidate = pathname.replace(/^\//, '');
    // try direct
    let resp = handleApi(req, candidate, body);
    if (!resp && candidate.startsWith('api/llm/')) {
      resp = handleApi(req, candidate.substring('api/llm/'.length), body);
    }
    // also try removing leading 'api/llm' if present
    if (!resp && candidate.startsWith('api/')) {
      resp = handleApi(req, candidate.substring('api/'.length), body);
    }

    // fallback root and items/echo endpoints
    if (!resp) {
      if (pathname === '/' ) return json(res, { status: 'ok', service: 'ci-mock' });
      if (pathname === '/metrics') return json(res, {});
      if (pathname === '/api/items' || pathname === '/api/items/') return json(res, { items: [] });
      if (pathname === '/api/echo' && req.method === 'POST') {
        try { const obj = body ? JSON.parse(body) : {}; return json(res, { echo: obj }); } catch(e) { return json(res, { echo: body }); }
      }
      // not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'not_found' }));
    }

    // send response
    json(res, resp.body, resp.code);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ci-mock listening on http://localhost:${PORT}`);
});

// graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

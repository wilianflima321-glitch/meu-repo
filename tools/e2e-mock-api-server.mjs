#!/usr/bin/env node

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 1234)

const jobs = [
  {
    id: 'job-demo-build',
    type: 'build',
    status: 'completed',
    priority: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
  },
]

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '0',
    'x-ratelimit-limit': '1000',
    'x-ratelimit-remaining': '999',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    const contentType = req.headers['content-type'] || ''
    if (contentType.includes('application/json')) {
      const error = new Error('Malformed JSON')
      error.statusCode = 400
      throw error
    }
    return raw
  }
}

function getPath(req) {
  return new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`)
}

function handleHealth(req, res, pathname) {
  if (pathname === '/health') {
    return sendJson(res, 200, {
      status: 'pass',
      services: {
        database: 'ok',
        redis: 'ok',
        queue: 'ok',
      },
      timestamp: new Date().toISOString(),
    })
  }

  if (pathname === '/health/live') {
    return sendJson(res, 200, { status: 'ok' })
  }

  if (pathname === '/health/ready') {
    return sendJson(res, 200, { status: 'ok', ready: true })
  }

  return false
}

function handleDocs(req, res, pathname) {
  if (pathname === '/metrics') {
    return sendText(
      res,
      200,
      [
        '# HELP aethel_e2e_mock_requests_total Total requests handled by the E2E mock API',
        '# TYPE aethel_e2e_mock_requests_total counter',
        'aethel_e2e_mock_requests_total 1',
        '',
      ].join('\n'),
    )
  }

  if (pathname === '/api/info') {
    return sendJson(res, 200, {
      name: 'Aethel Engine Server',
      version: 'e2e-contract',
      features: ['health', 'jobs', 'ai-contracts', 'openapi'],
      endpoints: {
        ws: {
          bridge: '/bridge',
          browser: '/browser',
        },
      },
    })
  }

  if (pathname === '/api/openapi.json') {
    return sendJson(res, 200, {
      openapi: '3.1.0',
      info: {
        title: 'Aethel Engine API',
        version: 'e2e-contract',
      },
      paths: {
        '/health': {},
        '/api/info': {},
        '/api/ai/generate': {},
      },
    })
  }

  if (pathname === '/api/docs') {
    return sendText(
      res,
      200,
      [
        '<!doctype html>',
        '<html><head><title>Aethel Engine API</title></head>',
        '<body><main class="swagger-ui"><section class="info"><h1 class="title">Aethel Engine API</h1></section></main></body></html>',
      ].join(''),
      'text/html; charset=utf-8',
    )
  }

  return false
}

async function handleAi(req, res, pathname) {
  if (pathname !== '/api/ai/chat' && pathname !== '/api/ai/generate') {
    return false
  }

  if (req.method !== 'POST') {
    return sendJson(res, 401, { error: 'authentication_required' })
  }

  let body
  try {
    body = await readBody(req)
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: 'malformed_json' })
  }

  if (pathname === '/api/ai/chat') {
    if (!body || !Array.isArray(body.messages)) {
      return sendJson(res, 400, { error: 'messages_required' })
    }

    return sendJson(res, 200, {
      id: `chat-${randomUUID()}`,
      role: 'assistant',
      content: 'E2E mock response: mission contract accepted.',
    })
  }

  if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return sendJson(res, 400, { error: 'prompt_required' })
  }

  return sendJson(res, 200, {
    id: `gen-${randomUUID()}`,
    text: 'E2E mock generation: create a compact Aethel artifact.',
  })
}

async function handleJobs(req, res, pathname, searchParams) {
  if (pathname === '/jobs' && req.method === 'GET') {
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = Number(searchParams.get('limit') || jobs.length)
    let filtered = jobs.slice()

    if (status) filtered = filtered.filter((job) => job.status === status)
    if (type) filtered = filtered.filter((job) => job.type === type)

    return sendJson(res, 200, {
      jobs: filtered.slice(0, limit),
      pagination: { page: Number(searchParams.get('page') || 1), limit },
    })
  }

  if (pathname === '/jobs' && req.method === 'POST') {
    let body
    try {
      body = await readBody(req)
    } catch {
      return sendJson(res, 400, { error: 'malformed_json' })
    }

    if (!body || typeof body.type !== 'string') {
      return sendJson(res, 400, { error: 'type_required' })
    }

    if (!['build', 'render', 'deploy', 'analysis'].includes(body.type)) {
      return sendJson(res, 400, { error: 'invalid_type' })
    }

    const job = {
      id: `job-${randomUUID()}`,
      type: body.type,
      status: 'pending',
      priority: body.priority || 0,
      payload: body.payload || {},
      createdAt: new Date().toISOString(),
    }
    jobs.push(job)
    return sendJson(res, 201, job)
  }

  if (pathname === '/jobs/stats') {
    return sendJson(res, 200, {
      pending: jobs.filter((job) => job.status === 'pending').length,
      processing: jobs.filter((job) => job.status === 'processing').length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      health: 'healthy',
    })
  }

  if (pathname === '/jobs/start' && req.method === 'POST') {
    return sendJson(res, 200, { message: 'Queue started' })
  }

  if (pathname === '/jobs/stop' && req.method === 'POST') {
    return sendJson(res, 200, { message: 'Queue stopped' })
  }

  if (pathname.startsWith('/jobs/')) {
    return sendJson(res, 404, { error: 'job_not_found' })
  }

  return false
}

async function handleRequest(req, res) {
  const url = getPath(req)
  const { pathname, searchParams } = url

  if (handleHealth(req, res, pathname) !== false) return
  if (handleDocs(req, res, pathname) !== false) return
  if ((await handleAi(req, res, pathname)) !== false) return
  if ((await handleJobs(req, res, pathname, searchParams)) !== false) return

  if (pathname === '/api/projects' || pathname === '/api/render/queue') {
    return sendJson(res, 401, { error: 'authentication_required' })
  }

  if (pathname === '/api/internal-error-test') {
    return sendJson(res, 500, { error: 'internal_error' })
  }

  return sendJson(res, 404, { error: 'not_found' })
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    sendJson(res, 500, { error: 'internal_error' })
  })
})

server.listen(PORT, () => {
  process.stdout.write(`Aethel E2E mock API listening on http://localhost:${PORT}\n`)
})

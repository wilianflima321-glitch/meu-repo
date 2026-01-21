// =============================================================================
// AETHEL ENGINE - LOAD TESTING WITH K6
// =============================================================================
//
// Run with: k6 run load-test.js
// Cloud run: k6 cloud load-test.js
//
// Requirements:
// - Install k6: https://k6.io/docs/getting-started/installation/
// - Server running on localhost:1234
//
// Options:
// - k6 run --vus 10 --duration 30s load-test.js
// - k6 run --env BASE_URL=https://api.aethel.io load-test.js
//

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:1234';
const WS_URL = __ENV.WS_URL || 'ws://localhost:1234';

export const options = {
  scenarios: {
    // Smoke test - verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      startTime: '0s',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Ramp up
        { duration: '3m', target: 20 },   // Stay at 20
        { duration: '1m', target: 50 },   // Ramp to 50
        { duration: '3m', target: 50 },   // Stay at 50
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '35s',
      tags: { test_type: 'load' },
    },
    
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      startTime: '12m',
      tags: { test_type: 'stress' },
      gracefulRampDown: '30s',
    },
    
    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '10s', target: 200 }, // Spike!
        { duration: '3m', target: 200 },
        { duration: '10s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '10s', target: 0 },
      ],
      startTime: '30m',
      tags: { test_type: 'spike' },
    },
  },
  
  thresholds: {
    // HTTP thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],  // <1% failure rate
    
    // Custom thresholds
    'http_req_duration{endpoint:health}': ['p(99)<200'],
    'http_req_duration{endpoint:api}': ['p(95)<1000'],
    'http_req_duration{endpoint:ai}': ['p(95)<3000'],
    
    // WebSocket thresholds
    ws_connecting: ['p(95)<1000'],
    ws_msgs_sent: ['count>0'],
    
    // Error rate by type
    'errors': ['rate<0.05'],
  },
};

// =============================================================================
// CUSTOM METRICS
// =============================================================================

const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration', true);
const apiLatency = new Trend('api_latency', true);
const aiResponseTime = new Trend('ai_response_time', true);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAuthHeaders() {
  // In production, get real token
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
  };
}

function checkResponse(res, name) {
  const success = check(res, {
    [`${name}: status is 200-299`]: (r) => r.status >= 200 && r.status < 300,
    [`${name}: response time < 500ms`]: (r) => r.timings.duration < 500,
    [`${name}: has body`]: (r) => r.body && r.body.length > 0,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  return success;
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

export default function() {
  // Health Check Tests
  group('Health Checks', () => {
    // Basic health
    const healthRes = http.get(`${BASE_URL}/health`, {
      tags: { endpoint: 'health' },
    });
    healthCheckDuration.add(healthRes.timings.duration);
    checkResponse(healthRes, 'health');
    
    // Liveness probe
    const liveRes = http.get(`${BASE_URL}/health/live`, {
      tags: { endpoint: 'health' },
    });
    check(liveRes, {
      'liveness: status is 200': (r) => r.status === 200,
    });
    
    // Readiness probe
    const readyRes = http.get(`${BASE_URL}/health/ready`, {
      tags: { endpoint: 'health' },
    });
    check(readyRes, {
      'readiness: status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    });
  });
  
  sleep(randomIntBetween(1, 3));
  
  // API Endpoint Tests
  group('API Endpoints', () => {
    const headers = getAuthHeaders();
    
    // Get API info
    const infoRes = http.get(`${BASE_URL}/api/info`, {
      headers,
      tags: { endpoint: 'api' },
    });
    apiLatency.add(infoRes.timings.duration);
    checkResponse(infoRes, 'api/info');
    
    // List projects
    const projectsRes = http.get(`${BASE_URL}/api/projects?limit=10`, {
      headers,
      tags: { endpoint: 'api' },
    });
    apiLatency.add(projectsRes.timings.duration);
    check(projectsRes, {
      'projects: status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });
  
  sleep(randomIntBetween(1, 2));
  
  // AI Endpoint Tests (if enabled)
  if (__ENV.TEST_AI === 'true') {
    group('AI Endpoints', () => {
      const headers = getAuthHeaders();
      
      const aiRes = http.post(
        `${BASE_URL}/api/ai/generate`,
        JSON.stringify({
          prompt: 'Generate a simple test response',
          maxTokens: 50,
        }),
        {
          headers,
          tags: { endpoint: 'ai' },
          timeout: '10s',
        }
      );
      
      aiResponseTime.add(aiRes.timings.duration);
      check(aiRes, {
        'ai: status is 200 or 401 or 429': (r) => 
          r.status === 200 || r.status === 401 || r.status === 429,
        'ai: response time < 5s': (r) => r.timings.duration < 5000,
      });
    });
  }
  
  sleep(randomIntBetween(1, 2));
  
  // Metrics endpoint
  group('Metrics', () => {
    const metricsRes = http.get(`${BASE_URL}/metrics`, {
      tags: { endpoint: 'health' },
    });
    check(metricsRes, {
      'metrics: status is 200': (r) => r.status === 200,
      'metrics: has prometheus format': (r) => 
        r.body && (r.body.includes('# HELP') || r.body.includes('# TYPE')),
    });
  });
}

// =============================================================================
// WEBSOCKET TEST (separate scenario)
// =============================================================================

export function websocketTest() {
  const wsRes = ws.connect(`${WS_URL}/bridge`, {}, function(socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');
      
      // Send ping
      socket.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
      }));
    });
    
    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      check(msg, {
        'ws: received message': (m) => m !== null,
      });
    });
    
    socket.on('close', () => {
      console.log('WebSocket closed');
    });
    
    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      errorRate.add(1);
    });
    
    // Keep connection open for a bit
    socket.setTimeout(function() {
      socket.close();
    }, 5000);
  });
  
  check(wsRes, {
    'ws: connected successfully': (r) => r && r.status === 101,
  });
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Verify server is up
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`Server health check failed: ${res.status}`);
  }
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
  };
}

export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}

// =============================================================================
// HTML REPORT HANDLER
// =============================================================================

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`tests/load/results/summary-${now}.json`]: JSON.stringify(data, null, 2),
    [`tests/load/results/summary-${now}.html`]: htmlReport(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  return `
================================================================================
                        AETHEL ENGINE LOAD TEST RESULTS
================================================================================

Test Duration: ${data.state.testRunDurationMs}ms
Total Requests: ${data.metrics.http_reqs?.values?.count || 0}
Failed Requests: ${data.metrics.http_req_failed?.values?.rate || 0}%

Response Times:
  - p(50): ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 'N/A'}ms
  - p(95): ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms
  - p(99): ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms

Thresholds:
${Object.entries(data.metrics)
  .filter(([k, v]) => v.thresholds)
  .map(([k, v]) => `  - ${k}: ${Object.entries(v.thresholds).map(([t, p]) => `${t}=${p.ok ? '✓' : '✗'}`).join(', ')}`)
  .join('\n')}

================================================================================
`;
}

function htmlReport(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Aethel Engine Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #0f172a; color: #e2e8f0; }
    h1 { color: #818cf8; }
    .metric { background: #1e293b; padding: 20px; margin: 10px 0; border-radius: 8px; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #334155; }
  </style>
</head>
<body>
  <h1>🚀 Aethel Engine Load Test Results</h1>
  <div class="metric">
    <h3>Summary</h3>
    <p>Duration: ${data.state.testRunDurationMs}ms</p>
    <p>Total HTTP Requests: ${data.metrics.http_reqs?.values?.count || 0}</p>
  </div>
  <div class="metric">
    <h3>Response Times</h3>
    <table>
      <tr><th>Percentile</th><th>Duration</th></tr>
      <tr><td>p(50)</td><td>${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 'N/A'}ms</td></tr>
      <tr><td>p(95)</td><td>${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms</td></tr>
      <tr><td>p(99)</td><td>${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms</td></tr>
    </table>
  </div>
</body>
</html>`;
}

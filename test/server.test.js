/**
 * Automated Tests for Service Status Dashboard
 *
 * Uses Node.js built-in test runner (node:test) – available from Node 18+.
 * No external test framework needed.
 *
 * Run with:  npm test
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// We import the server module but it should NOT auto-start during tests.
// We'll start it on a random port so it doesn't conflict with a running instance.
const TEST_PORT = 3099;
process.env.PORT = String(TEST_PORT);
process.env.SERVICE_NAME    = 'Test Service';
process.env.SERVICE_VERSION = '0.0.1-test';
process.env.NODE_ENV        = 'test';

// Require server AFTER setting env vars so CONFIG picks them up
const { server } = require('../src/server');

// ---------------------------------------------------------------------------
// Helper – make an HTTP GET request and return { statusCode, headers, body }
// ---------------------------------------------------------------------------
function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${TEST_PORT}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Lifecycle – start server before tests, close it after
// ---------------------------------------------------------------------------
before(() => new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve)));
after(()  => new Promise((resolve) => server.close(resolve)));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test('GET / returns 200 and HTML dashboard', async () => {
  const res = await get('/');
  assert.equal(res.statusCode, 200, 'Status should be 200');
  assert.ok(
    res.headers['content-type'].includes('text/html'),
    'Content-Type should be text/html'
  );
  assert.ok(res.body.includes('Test Service'), 'Body should include service name');
  assert.ok(res.body.includes('HEALTHY'), 'Body should include status badge');
});

test('GET /health returns 200 and valid JSON', async () => {
  const res = await get('/health');
  assert.equal(res.statusCode, 200, 'Status should be 200');
  assert.ok(
    res.headers['content-type'].includes('application/json'),
    'Content-Type should be application/json'
  );
  const json = JSON.parse(res.body);
  assert.equal(json.status, 'healthy', 'status field should be "healthy"');
  assert.equal(json.service, 'Test Service', 'service field should match env var');
  assert.equal(json.version, '0.0.1-test', 'version field should match env var');
  assert.ok(typeof json.uptime === 'number', 'uptime should be a number');
  assert.ok(json.timestamp, 'timestamp should be present');
});

test('GET /metrics returns 200 and Prometheus text format', async () => {
  const res = await get('/metrics');
  assert.equal(res.statusCode, 200, 'Status should be 200');
  assert.ok(
    res.headers['content-type'].includes('text/plain'),
    'Content-Type should be text/plain'
  );
  assert.ok(res.body.includes('http_requests_total'), 'Should include requests counter');
  assert.ok(res.body.includes('http_errors_total'),   'Should include errors counter');
  assert.ok(res.body.includes('process_uptime_seconds'), 'Should include uptime gauge');
  assert.ok(res.body.includes('# HELP'),  'Should include HELP comments');
  assert.ok(res.body.includes('# TYPE'),  'Should include TYPE comments');
});

test('GET /unknown-path returns 404', async () => {
  const res = await get('/unknown-path');
  assert.equal(res.statusCode, 404, 'Status should be 404');
  const json = JSON.parse(res.body);
  assert.equal(json.error, 'Not Found', 'error field should say "Not Found"');
});

test('X-Service response header is set', async () => {
  const res = await get('/health');
  assert.ok(res.headers['x-service'], 'X-Service header should be present');
});

test('metrics counter increments with each request', async () => {
  // Hit /metrics twice to make the counter visibly increase
  const res1 = await get('/metrics');
  const res2 = await get('/metrics');

  // Parse the http_requests_total value from both responses
  const extract = (body) => {
    const match = body.match(/^http_requests_total\{[^}]+\}\s+(\d+)/m);
    return match ? parseInt(match[1], 10) : null;
  };

  const count1 = extract(res1.body);
  const count2 = extract(res2.body);

  assert.ok(count1 !== null, 'Should find http_requests_total in first response');
  assert.ok(count2 !== null, 'Should find http_requests_total in second response');
  assert.ok(count2 > count1, 'Counter should increase between requests');
});

/**
 * Service Status Dashboard - Main Application Server
 *
 * This is the entry point of our application.
 * It uses ONLY Node.js built-in modules (no external dependencies).
 *
 * Endpoints:
 *   GET /        - HTML dashboard
 *   GET /health  - JSON health check (used by Kubernetes probes)
 *   GET /metrics - Prometheus-compatible plain-text metrics
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration – read from environment variables with sensible defaults
// ---------------------------------------------------------------------------
const CONFIG = {
  PORT:            parseInt(process.env.PORT            || '3000', 10),
  HOST:            process.env.HOST                     || '0.0.0.0',
  SERVICE_NAME:    process.env.SERVICE_NAME             || 'Service Status Dashboard',
  SERVICE_VERSION: process.env.SERVICE_VERSION          || '1.0.0',
  ENV:             process.env.NODE_ENV                 || 'development',
};

// ---------------------------------------------------------------------------
// In-memory metrics counters
// ---------------------------------------------------------------------------
const metrics = {
  requestsTotal:  0,   // every request received
  errorsTotal:    0,   // every response that was 4xx or 5xx
  latencySumMs:   0,   // cumulative response time in milliseconds
  startTimeMs:    Date.now(),
};

// ---------------------------------------------------------------------------
// HTML template for the dashboard page
// ---------------------------------------------------------------------------
function buildDashboardHtml(status, uptimeSec) {
  const uptimeStr = formatUptime(uptimeSec);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${CONFIG.SERVICE_NAME}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 2.5rem;
      width: 420px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    h1 { font-size: 1.5rem; color: #38bdf8; margin-bottom: 1.5rem; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 0;
      border-bottom: 1px solid #334155;
      font-size: 0.95rem;
    }
    .row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .green  { background: #16a34a; color: #fff; }
    .red    { background: #dc2626; color: #fff; }
    .footer { text-align: center; margin-top: 1.5rem; font-size: 0.75rem; color: #475569; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📊 ${CONFIG.SERVICE_NAME}</h1>
    <div class="row">
      <span class="label">Status</span>
      <span class="badge ${status === 'healthy' ? 'green' : 'red'}">${status.toUpperCase()}</span>
    </div>
    <div class="row">
      <span class="label">Version</span>
      <span>${CONFIG.SERVICE_VERSION}</span>
    </div>
    <div class="row">
      <span class="label">Environment</span>
      <span>${CONFIG.ENV}</span>
    </div>
    <div class="row">
      <span class="label">Uptime</span>
      <span>${uptimeStr}</span>
    </div>
    <div class="row">
      <span class="label">Requests served</span>
      <span>${metrics.requestsTotal}</span>
    </div>
    <div class="footer">
      <a href="/health">/health</a> &nbsp;|&nbsp; <a href="/metrics">/metrics</a>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helper – format seconds into human-readable uptime
// ---------------------------------------------------------------------------
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// ---------------------------------------------------------------------------
// Helper – build Prometheus plain-text metrics
// ---------------------------------------------------------------------------
function buildPrometheusMetrics() {
  const uptimeSec = (Date.now() - metrics.startTimeMs) / 1000;
  const avgLatency = metrics.requestsTotal > 0
    ? (metrics.latencySumMs / metrics.requestsTotal).toFixed(2)
    : '0';

  return [
    '# HELP http_requests_total Total number of HTTP requests received',
    '# TYPE http_requests_total counter',
    `http_requests_total{service="${CONFIG.SERVICE_NAME}",version="${CONFIG.SERVICE_VERSION}"} ${metrics.requestsTotal}`,
    '',
    '# HELP http_errors_total Total number of HTTP error responses (4xx/5xx)',
    '# TYPE http_errors_total counter',
    `http_errors_total{service="${CONFIG.SERVICE_NAME}",version="${CONFIG.SERVICE_VERSION}"} ${metrics.errorsTotal}`,
    '',
    '# HELP http_request_duration_ms_avg Average HTTP request latency in milliseconds',
    '# TYPE http_request_duration_ms_avg gauge',
    `http_request_duration_ms_avg{service="${CONFIG.SERVICE_NAME}",version="${CONFIG.SERVICE_VERSION}"} ${avgLatency}`,
    '',
    '# HELP process_uptime_seconds Time in seconds since the process started',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds{service="${CONFIG.SERVICE_NAME}",version="${CONFIG.SERVICE_VERSION}"} ${uptimeSec.toFixed(2)}`,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Request router
// ---------------------------------------------------------------------------
function handleRequest(req, res) {
  const startMs = Date.now();

  // Track all incoming requests immediately (before routing)
  metrics.requestsTotal += 1;

  const url    = req.url.split('?')[0]; // strip query string
  const method = req.method;

  let statusCode = 200;
  let body       = '';
  let contentType = 'text/plain; charset=utf-8';

  if (method === 'GET' && url === '/') {
    // --- Dashboard ---
    const uptimeSec = (Date.now() - metrics.startTimeMs) / 1000;
    body        = buildDashboardHtml('healthy', uptimeSec);
    contentType = 'text/html; charset=utf-8';

  } else if (method === 'GET' && url === '/health') {
    // --- Health check endpoint (used by Kubernetes) ---
    const uptimeSec = (Date.now() - metrics.startTimeMs) / 1000;
    body        = JSON.stringify({
      status:  'healthy',
      service: CONFIG.SERVICE_NAME,
      version: CONFIG.SERVICE_VERSION,
      env:     CONFIG.ENV,
      uptime:  parseFloat(uptimeSec.toFixed(2)),
      timestamp: new Date().toISOString(),
    }, null, 2);
    contentType = 'application/json; charset=utf-8';

  } else if (method === 'GET' && url === '/metrics') {
    // --- Prometheus metrics endpoint ---
    body        = buildPrometheusMetrics();
    contentType = 'text/plain; version=0.0.4; charset=utf-8';

  } else {
    // --- 404 for everything else ---
    statusCode = 404;
    body       = JSON.stringify({ error: 'Not Found', path: url }, null, 2);
    contentType = 'application/json; charset=utf-8';
  }

  // Record errors
  if (statusCode >= 400) {
    metrics.errorsTotal += 1;
  }

  // Record latency
  metrics.latencySumMs += (Date.now() - startMs);

  // Send response
  res.writeHead(statusCode, {
    'Content-Type':   contentType,
    'Content-Length': Buffer.byteLength(body),
    'X-Service':      CONFIG.SERVICE_NAME,
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Create the HTTP server (do NOT call listen here – see note below)
// ---------------------------------------------------------------------------
const server = http.createServer(handleRequest);

// ---------------------------------------------------------------------------
// Graceful shutdown – important for Kubernetes pod termination
// ---------------------------------------------------------------------------
function shutdown(signal) {
  console.log(`\n⚠️  Received ${signal}. Shutting down gracefully…`);
  server.close(() => {
    console.log('✅ Server closed. Goodbye!');
    process.exit(0);
  });

  // Force-exit after 10 seconds if connections are still open
  setTimeout(() => {
    console.error('❌ Forced shutdown after 10 s timeout.');
    process.exit(1);
  }, 10_000);
}

// ---------------------------------------------------------------------------
// Auto-start only when this file is run directly (node src/server.js).
// When required() by tests, the test's before() hook starts the server
// on a dedicated test port instead, avoiding ERR_SERVER_ALREADY_LISTEN.
// ---------------------------------------------------------------------------
if (require.main === module) {
  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`✅ ${CONFIG.SERVICE_NAME} v${CONFIG.SERVICE_VERSION} started`);
    console.log(`   Listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`   Environment : ${CONFIG.ENV}`);
    console.log(`   Dashboard   : http://localhost:${CONFIG.PORT}/`);
    console.log(`   Health      : http://localhost:${CONFIG.PORT}/health`);
    console.log(`   Metrics     : http://localhost:${CONFIG.PORT}/metrics`);
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

// Export server and helpers for use in tests
module.exports = { server, CONFIG, metrics };

# Service Status Dashboard

A simple **Service Status Dashboard** built with Node.js and plain HTML.  
This is my Advanced DevOps final project demonstrating Docker, CI/CD, Kubernetes, Prometheus, and more.

## Features

- `GET /` — HTML dashboard showing service name, status, version, and uptime
- `GET /health` — JSON health check (used by Kubernetes readiness/liveness probes)
- `GET /metrics` — Prometheus-compatible metrics (requests, errors, latency, uptime)
- Graceful shutdown on `SIGTERM`/`SIGINT`
- Zero external npm dependencies — only Node.js built-ins

## Prerequisites

- Node.js 18 or later
- Docker (for containerised runs)
- kubectl + kind (for Kubernetes)

## Quick Start — Local

```bash
# Install dependencies (there are none, but this sets up the project)
npm install

# Run the application
npm start

# Open in your browser
# http://localhost:3000
```

## Environment Variables

| Variable          | Default                    | Description                      |
|-------------------|----------------------------|----------------------------------|
| `PORT`            | `3000`                     | TCP port the server listens on   |
| `HOST`            | `0.0.0.0`                  | Network interface to bind        |
| `SERVICE_NAME`    | `Service Status Dashboard` | Name shown on the dashboard      |
| `SERVICE_VERSION` | `1.0.0`                    | Version shown on the dashboard   |
| `NODE_ENV`        | `development`              | Runtime environment label        |

## Running Tests

```bash
npm test
```

## Running Lint

```bash
npm run lint
```

## Docker

```bash
# Build the image
docker build -t service-status-dashboard:latest .

# Run the container
docker run -p 3000:3000 service-status-dashboard:latest
```

## Kubernetes (kind)

See [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for full deployment instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/BASELINE.md`](docs/BASELINE.md) | Baseline commit hash and verification steps |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design and component overview |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architectural decision records |
| [`docs/RELIABILITY.md`](docs/RELIABILITY.md) | SLI, SLO, SLA, and error budgets |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Step-by-step operations guide |
| [`docs/VIVA-GUIDE.md`](docs/VIVA-GUIDE.md) | 40+ viva Q&A for exam preparation |

# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User / Browser                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Service Status Dashboard (Node.js)                 │
│                                                                 │
│   GET /          → HTML Dashboard                               │
│   GET /health    → JSON Health Check                            │
│   GET /metrics   → Prometheus Plain-Text Metrics                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ scrapes /metrics every 15s
                               ▼
┌──────────────────┐    ┌─────────────────┐
│   Prometheus     │───▶│     Grafana      │
│  (time-series DB)│    │   (dashboards)   │
└──────────────────┘    └─────────────────┘
```

## Components

### Application (`src/server.js`)
- Pure Node.js HTTP server — zero npm dependencies
- Three endpoints: dashboard, health check, metrics
- In-memory counters for requests, errors, and latency
- Graceful shutdown on SIGTERM/SIGINT

### Container (`Dockerfile`)
- Base image: `node:24-alpine` (small, secure)
- Runs as non-root user `appuser`
- Built-in Docker health check via `/health`

### Kubernetes (`k8s/`)
| Resource | Purpose |
|----------|---------|
| `namespace.yaml` | Logical isolation — all resources live in `ssd` namespace |
| `configmap.yaml` | Non-secret environment variables |
| `secret.yaml` | Sensitive values (base64, not encrypted) |
| `deployment.yaml` | Manages 2 Pod replicas with rolling update |
| `service.yaml` | Stable internal network endpoint (ClusterIP) |

### CI/CD (`.github/workflows/`)
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push / PR | Run tests, lint, Docker build, K8s validation |
| `cd.yml` | Merge to master | Publish image to GHCR |

### Monitoring (`monitoring/`)
| File | Purpose |
|------|---------|
| `prometheus.yml` | Scrape configuration |
| `alert_rules.yml` | Alert conditions |
| `grafana-dashboard.json` | Pre-built dashboard |
| `docker-compose.monitoring.yml` | Start full monitoring stack locally |

## Port Map

| Service | Local Port | Container Port | Notes |
|---------|-----------|----------------|-------|
| App | 3000 | 3000 | `npm start` |
| App (Docker) | 3001 | 3000 | `docker run -p 3001:3000` |
| App (K8s port-forward) | 8080 | 3000 | `kubectl port-forward` |
| Prometheus | 9090 | 9090 | Monitoring stack |
| Grafana | 3002 | 3000 | Monitoring stack |

## Data Flow

```
Request → Node.js server
         ↓
    Route matched?
    ├── /         → Build HTML → return 200 text/html
    ├── /health   → Build JSON → return 200 application/json
    ├── /metrics  → Build Prometheus text → return 200 text/plain
    └── other     → return 404 application/json

After each response:
    metrics.requestsTotal++
    if statusCode >= 400: metrics.errorsTotal++
    metrics.latencySumMs += elapsed
```

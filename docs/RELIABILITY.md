# Reliability: SLI, SLO, SLA, and Error Budgets

> **Note:** The targets and calculations below are **educational examples** for this
> project. They are not contractual obligations or fabricated production measurements.

---

## Core Concepts

### SLI — Service Level Indicator
An **SLI** is a **measurement** of how well your service is performing.
It is a real, observable number — not a target.

Examples for this project:
- **Availability SLI**: % of `/health` requests returning HTTP 200
- **Latency SLI**: % of requests completing in under 200 ms
- **Error SLI**: % of requests that returned a 4xx or 5xx status

### SLO — Service Level Objective
An **SLO** is the **target** you set for an SLI, measured over a time window.

| SLO | Target | Window |
|-----|--------|--------|
| Availability | ≥ 99.5% of `/health` requests succeed | Rolling 30 days |
| Latency | ≥ 95% of requests complete in < 200 ms | Rolling 30 days |
| Error rate | < 1% of all requests return 5xx | Rolling 30 days |

### SLA — Service Level Agreement
An **SLA** is a **contract** between a service provider and its users.
It typically includes the SLOs plus **consequences** if they are breached
(e.g., service credits, penalties, or escalations).

> **This project does not have a real SLA** — it is a student demo application.
> A real SLA would be written by a legal/business team alongside engineers.

### Error Budget
An **error budget** is the amount of unreliability you are *allowed* before
breaching an SLO.

```
Error Budget = 1 - SLO target

For 99.5% availability over 30 days:
Error Budget = 0.5% of 30 days
             = 0.005 × 30 × 24 × 60 minutes
             = 216 minutes of allowed downtime per month
```

If you deploy often and burn the error budget quickly, you should slow down
releases until reliability improves.

---

## Prometheus Queries for Our Application

### Current Availability (last 5 minutes)
```promql
1 - (
  rate(http_errors_total[5m])
  /
  rate(http_requests_total[5m])
)
```

### Error Ratio (last 5 minutes)
```promql
rate(http_errors_total[5m])
/
rate(http_requests_total[5m])
```

### Average Latency
```promql
http_request_duration_ms_avg
```

### Request Rate (per minute)
```promql
rate(http_requests_total[1m]) * 60
```

---

## Detecting and Responding to an SLO Breach

1. **Detect** — Prometheus fires an alert (see `monitoring/alert_rules.yml`)
2. **Triage** — Check `/metrics` directly; check Grafana dashboard
3. **Investigate** — Look at pod logs: `kubectl logs -n ssd -l app=service-status-dashboard`
4. **Respond** — Roll back if a recent deploy caused it: `kubectl rollout undo deployment/ssd-deployment -n ssd`
5. **Post-mortem** — Document what happened, why, and what changes prevent it

---

## Availability Math Reference

| Availability | Downtime per month |
|---|---|
| 90% ("one nine") | ~72 hours |
| 99% ("two nines") | ~7.2 hours |
| 99.5% | ~3.6 hours |
| 99.9% ("three nines") | ~43.8 minutes |
| 99.99% ("four nines") | ~4.4 minutes |

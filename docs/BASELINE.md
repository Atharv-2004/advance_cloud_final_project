# Baseline Commit Record

This document records the exact state of the original working application
before any DevOps improvements were added.

## Baseline Information

| Field | Value |
|-------|-------|
| **Commit Hash (short)** | `7b7a6de` |
| **Branch** | `master` |
| **Date** | 2026-10-16 |
| **Author** | DevOps Student |

## What the Baseline Contains

The baseline is the **simplest working version** of the application:

| File | Purpose |
|------|---------|
| `src/server.js` | Node.js HTTP server – the entire application |
| `test/server.test.js` | 6 automated tests using Node.js built-in test runner |
| `scripts/lint.js` | Minimal lint script (no external tools needed) |
| `package.json` | Project metadata and npm scripts |
| `README.md` | Basic run instructions |
| `.gitignore` | Prevents committing secrets and build artefacts |

## How to Verify the Baseline

Run these commands at any time to return to and inspect the baseline:

```bash
# See the baseline commit details
git show 7b7a6de

# List the files in the baseline
git ls-tree 7b7a6de

# Check out a temporary copy (read-only, does not delete your work)
git checkout 7b7a6de -- src/server.js

# View baseline vs. current differences
git diff 7b7a6de HEAD
```

## Running the Baseline Application

```bash
# Start the server
npm start

# In another terminal, test each endpoint:
curl http://localhost:3000/
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## Baseline Test Results

```
✔ GET / returns 200 and HTML dashboard
✔ GET /health returns 200 and valid JSON
✔ GET /metrics returns 200 and Prometheus text format
✔ GET /unknown-path returns 404
✔ X-Service response header is set
✔ metrics counter increments with each request

tests 6  pass 6  fail 0
```

## Preservation Guarantee

> **The baseline commit (`7b7a6de`) will NEVER be deleted, rebased, amended,
> or force-pushed away. All DevOps improvements are added on the `devops-demo`
> feature branch, which branches off this commit.**

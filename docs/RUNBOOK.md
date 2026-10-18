# Operations Runbook

## Quick Reference

| Task | Command |
|------|---------|
| Start app locally | `npm start` |
| Run tests | `npm test` |
| Build Docker image | `docker build -t service-status-dashboard:latest .` |
| Run Docker container | `docker run -p 3000:3000 service-status-dashboard:latest` |
| Create kind cluster | `kind create cluster --name ssd-cluster` |
| Load image into kind | `kind load docker-image service-status-dashboard:latest --name ssd-cluster` |
| Deploy to Kubernetes | `kubectl apply -f k8s/` |
| Port-forward app | `kubectl port-forward svc/ssd-service 8080:80 -n ssd` |
| Check pod status | `kubectl get pods -n ssd` |
| View pod logs | `kubectl logs -n ssd -l app=service-status-dashboard` |
| Roll back deployment | `kubectl rollout undo deployment/ssd-deployment -n ssd` |
| Start monitoring | `docker compose -f monitoring/docker-compose.monitoring.yml up -d` |

---

## 1. Local Development

### Start the Application
```powershell
cd E:\projects\advance_cloud_final_project
npm start
```

Test the endpoints:
```powershell
# Dashboard
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing

# Health check
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing

# Metrics
Invoke-WebRequest http://localhost:3000/metrics -UseBasicParsing
```

---

## 2. Docker

### Build the Image
```powershell
docker build -t service-status-dashboard:latest .
```

**What happens:**
- Docker reads the `Dockerfile`
- Downloads the `node:24-alpine` base image (~50 MB)
- Copies application code into the image
- Creates an `appuser` non-root account
- Tags the image as `service-status-dashboard:latest`

### Run the Container
```powershell
docker run -p 3000:3000 service-status-dashboard:latest
```

### Run with Custom Environment Variables
```powershell
docker run -p 3000:3000 `
  -e SERVICE_NAME="My Service" `
  -e SERVICE_VERSION="2.0.0" `
  service-status-dashboard:latest
```

### Stop and Remove All Test Containers
```powershell
docker ps -a
docker stop <container-id>
docker rm <container-id>
```

---

## 3. Kubernetes with kind

### Step 1 — Create a kind Cluster
```powershell
kind create cluster --name ssd-cluster
```

**What kind does:** Creates a real Kubernetes cluster running inside a Docker container on your laptop.

### Step 2 — Load the Docker Image into kind
```powershell
kind load docker-image service-status-dashboard:latest --name ssd-cluster
```

**Why:** kind has its own container runtime. Images on your host machine are not automatically available inside the cluster.

### Step 3 — Apply All Manifests
```powershell
kubectl apply -f k8s/
```

### Step 4 — Verify Deployment
```powershell
# Check namespace was created
kubectl get namespace ssd

# Check pods are Running
kubectl get pods -n ssd

# Check service was created
kubectl get svc -n ssd

# Describe a pod for details
kubectl describe pod -n ssd -l app=service-status-dashboard
```

### Step 5 — Access the Application
```powershell
kubectl port-forward svc/ssd-service 8080:80 -n ssd
```

Then open: http://localhost:8080

### Step 6 — View Logs
```powershell
kubectl logs -n ssd -l app=service-status-dashboard --follow
```

---

## 4. Deploying a New Version

### Step 1 — Build the New Image
```powershell
docker build -t service-status-dashboard:v2.0.0 .
```

### Step 2 — Load into kind
```powershell
kind load docker-image service-status-dashboard:v2.0.0 --name ssd-cluster
```

### Step 3 — Update the Deployment
```powershell
kubectl set image deployment/ssd-deployment `
  ssd=service-status-dashboard:v2.0.0 -n ssd
```

### Step 4 — Watch Rollout
```powershell
kubectl rollout status deployment/ssd-deployment -n ssd
```

### Step 5 — Verify
```powershell
kubectl get pods -n ssd
```

---

## 5. Rolling Back a Bad Deployment

```powershell
# View rollout history
kubectl rollout history deployment/ssd-deployment -n ssd

# Roll back to the previous version
kubectl rollout undo deployment/ssd-deployment -n ssd

# Roll back to a specific revision
kubectl rollout undo deployment/ssd-deployment -n ssd --to-revision=2
```

---

## 6. Monitoring Stack

### Start Prometheus + Grafana
```powershell
# Make sure the app is running first (npm start)
docker compose -f monitoring/docker-compose.monitoring.yml up -d
```

| Service | URL | Credentials |
|---------|-----|------------|
| Prometheus | http://localhost:9090 | none |
| Grafana | http://localhost:3002 | admin / admin |

### Stop Monitoring Stack
```powershell
docker compose -f monitoring/docker-compose.monitoring.yml down
```

---

## 7. Investigating Problems

### Pod won't start
```powershell
kubectl describe pod -n ssd <pod-name>
kubectl logs -n ssd <pod-name>
```

### Deployment stuck
```powershell
kubectl rollout status deployment/ssd-deployment -n ssd
kubectl get events -n ssd --sort-by='.lastTimestamp'
```

### Image not found in kind
```powershell
# Re-load the image
kind load docker-image service-status-dashboard:latest --name ssd-cluster

# Check imagePullPolicy is "Never" in deployment.yaml
```

---

## 8. Clean Up

### Delete Kubernetes Resources
```powershell
kubectl delete -f k8s/
```

### Delete the kind Cluster
```powershell
kind delete cluster --name ssd-cluster
```

### Delete Docker Images
```powershell
docker rmi service-status-dashboard:latest
```

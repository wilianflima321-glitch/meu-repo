# Aethel Engine Infrastructure

This directory contains the Kubernetes manifests for deploying the Aethel Engine.

## Structure
- `base/`: Common resources (Deployments, Services, Ingress).
- `overlays/`: Environment specific configurations.
  - `production/`: High availability, real secrets, public ingress.
  - `staging/`: Single replica, mock data, private ingress.

## How to Deploy
Prerequisite: `kubectl` pointing to your cluster.

```bash
# Deploy to Staging
kubectl apply -k overlays/staging

# Deploy to Production
kubectl apply -k overlays/production
```

## Secrets Management
Production uses External Secrets Operator to fetch secrets from AWS Parameter Store/Secrets Manager.
Do NOT commit secrets to this repository.

# Module 10: Kubernetes & Container Orchestration

## Overview

Kubernetes (K8s) is the de facto standard for container orchestration. This module covers deploying microservices to Kubernetes, managing pods, services, deployments, and implementing autoscaling - all concepts used in our production platform.

## Learning Objectives

- ✅ Understand Kubernetes architecture
- ✅ Deploy applications with Deployments
- ✅ Expose services with Services and Ingress
- ✅ Manage configuration with ConfigMaps and Secrets
- ✅ Implement Horizontal Pod Autoscaling
- ✅ Handle persistent storage
- ✅ Organize resources with Namespaces

## Kubernetes Architecture

```mermaid
graph TB
    subgraph "Control Plane"
        API[API Server]
        ETCD[(etcd)]
        SCHED[Scheduler]
        CM[Controller Manager]
    end

    subgraph "Worker Node 1"
        KUB1[Kubelet]
        POD1[Pods]
        KP1[Kube-proxy]
    end

    subgraph "Worker Node 2"
        KUB2[Kubelet]
        POD2[Pods]
        KP2[Kube-proxy]
    end

    API --> ETCD
    API --> SCHED
    API --> CM
    API --> KUB1
    API --> KUB2
```

## Core Concepts

### Pods

Smallest deployable unit in Kubernetes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: user-service-pod
  labels:
    app: user-service
spec:
  containers:
  - name: user-service
    image: user-service:1.0.0
    ports:
    - containerPort: 3002
    env:
    - name: NODE_ENV
      value: "production"
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: user-service-secret
          key: database-url
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /health
        port: 3002
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 3002
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Deployments

Manage ReplicaSets and rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
  labels:
    app: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: user-service
        version: v1
    spec:
      containers:
      - name: user-service
        image: your-registry/user-service:1.0.0
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: user-service-config
              key: node-env
        - name: PORT
          value: "3002"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: user-service-secret
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Services

Expose pods to network traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: microservices
  labels:
    app: user-service
spec:
  type: ClusterIP
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3002
    protocol: TCP
    name: http
  sessionAffinity: None
```

**Service Types**:
- **ClusterIP**: Internal only (default)
- **NodePort**: Exposes on each node's IP
- **LoadBalancer**: Creates external load balancer
- **ExternalName**: Maps to DNS name

### ConfigMaps

Non-sensitive configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
  namespace: microservices
data:
  node-env: "production"
  log-level: "info"
  api-timeout: "5000"
  config.json: |
    {
      "feature": {
        "enabled": true
      }
    }
```

### Secrets

Sensitive data (base64 encoded):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: user-service-secret
  namespace: microservices
type: Opaque
data:
  database-url: cG9zdGdyZXNxbDovL3VzZXI6cGFzc0Bsb2NhbGhvc3Q6NTQzMi9kYg==
  jwt-secret: c3VwZXItc2VjcmV0LWtleQ==
```

Create secret from command line:
```bash
kubectl create secret generic user-service-secret \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="super-secret-key" \
  --namespace=microservices
```

### Ingress

HTTP/HTTPS routing:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: microservices
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 80
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

Auto-scale based on metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

## Namespaces

Organize resources:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices
  labels:
    environment: production
```

```bash
# Create namespace
kubectl create namespace microservices

# Deploy to namespace
kubectl apply -f deployment.yaml -n microservices

# Set default namespace
kubectl config set-context --current --namespace=microservices
```

## Persistent Volumes

```yaml
# Persistent Volume Claim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: microservices
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard

---
# Use in Pod
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15-alpine
    volumeMounts:
    - name: postgres-storage
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: postgres-storage
    persistentVolumeClaim:
      claimName: postgres-pvc
```

## kubectl Commands

```bash
# Get resources
kubectl get pods
kubectl get deployments
kubectl get services
kubectl get ingress
kubectl get nodes

# Get with details
kubectl get pods -o wide
kubectl get pods -n microservices

# Describe resource
kubectl describe pod user-service-pod
kubectl describe deployment user-service

# Create resources
kubectl apply -f deployment.yaml
kubectl apply -f . # All files in directory
kubectl apply -k k8s/base/ # Kustomize

# Delete resources
kubectl delete -f deployment.yaml
kubectl delete pod user-service-pod
kubectl delete deployment user-service

# Logs
kubectl logs user-service-pod
kubectl logs -f user-service-pod # Follow
kubectl logs user-service-pod --previous # Previous container

# Execute commands
kubectl exec -it user-service-pod -- sh
kubectl exec user-service-pod -- env

# Port forwarding (local testing)
kubectl port-forward pod/user-service-pod 3002:3002
kubectl port-forward service/user-service 3002:80

# Scale manually
kubectl scale deployment user-service --replicas=5

# Rolling update
kubectl set image deployment/user-service user-service=user-service:2.0.0
kubectl rollout status deployment/user-service
kubectl rollout history deployment/user-service
kubectl rollout undo deployment/user-service # Rollback

# Resource usage
kubectl top pods
kubectl top nodes

# Events
kubectl get events --sort-by='.lastTimestamp'
```

## Complete Deployment Example

```yaml
# user-service/deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
  namespace: microservices
data:
  NODE_ENV: "production"
  PORT: "3002"
  LOG_LEVEL: "info"

---
apiVersion: v1
kind: Secret
metadata:
  name: user-service-secret
  namespace: microservices
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/users"
  JWT_SECRET: "super-secret-key"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: user-service:1.0.0
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: user-service-config
        - secretRef:
            name: user-service-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: microservices
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3002

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Deploy:
```bash
kubectl apply -f user-service/deployment.yaml
kubectl get all -n microservices
```

## Best Practices

1. **Use Namespaces**: Organize by environment/team
2. **Set Resource Limits**: Prevent resource hogging
3. **Implement Health Checks**: Liveness and readiness probes
4. **Use Secrets for Sensitive Data**: Never hardcode credentials
5. **Enable Autoscaling**: HPA for dynamic scaling
6. **Use Labels**: For organization and selection
7. **Rolling Updates**: Zero-downtime deployments
8. **Monitor Everything**: Logs, metrics, traces

## Summary

- ✅ Kubernetes architecture and concepts
- ✅ Pods, Deployments, Services
- ✅ ConfigMaps and Secrets
- ✅ Ingress for HTTP routing
- ✅ Horizontal Pod Autoscaling
- ✅ Persistent storage
- ✅ kubectl command mastery

## Next Steps

1. Complete exercises in [exercises/](./exercises/)
2. Review [manifest-guide.md](./manifest-guide.md)
3. Complete [assignment.md](./assignment.md)
4. Proceed to [Module 11: Observability](../11-observability/README.md)

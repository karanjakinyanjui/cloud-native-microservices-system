# Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Scaling Strategies](#scaling-strategies)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Local multi-container orchestration |
| Kubernetes | 1.28+ | Production orchestration |
| kubectl | 1.28+ | Kubernetes CLI |
| Helm | 3.12+ | Kubernetes package manager |
| Node.js | 20.x | Runtime environment |
| npm | 10.x | Package manager |
| PostgreSQL | 15.x | Database |
| Redis | 7.x | Cache and session store |

### Optional Tools

| Tool | Purpose |
|------|---------|
| k9s | Kubernetes CLI UI |
| Lens | Kubernetes IDE |
| Minikube | Local Kubernetes cluster |
| Kind | Kubernetes in Docker |
| Skaffold | Development workflow |
| Tilt | Local Kubernetes development |

### Cloud Provider Requirements

For production deployment, you'll need one of:
- **AWS**: EKS cluster, RDS, ElastiCache
- **GCP**: GKE cluster, Cloud SQL, Memorystore
- **Azure**: AKS cluster, Azure Database, Azure Cache
- **DigitalOcean**: Kubernetes, Managed Database

### System Requirements

**Development Machine**:
- CPU: 4+ cores
- RAM: 16GB minimum, 32GB recommended
- Disk: 50GB available space
- OS: Linux, macOS, or Windows with WSL2

**Production Cluster**:
- Nodes: 3+ worker nodes (for high availability)
- CPU: 8+ cores per node
- RAM: 32GB+ per node
- Network: Low latency between nodes
- Storage: SSD-backed persistent volumes

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/cloud-native-microservices-system.git
cd cloud-native-microservices-system
```

### 2. Install Dependencies

```bash
# Install dependencies for all services
npm run install:all

# Or install individually
cd services/api-gateway && npm install
cd ../auth-service && npm install
cd ../user-service && npm install
cd ../product-service && npm install
cd ../order-service && npm install
cd ../payment-service && npm install
cd ../notification-service && npm install
```

### 3. Setup Environment Variables

```bash
# Copy example environment files
cp .env.example .env

# For each service
cd services/api-gateway
cp .env.example .env
# Edit .env with your values
```

### 4. Setup Local Databases

```bash
# Start PostgreSQL and Redis with Docker
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=microservices \
  -p 5432:5432 \
  postgres:15

docker run -d \
  --name redis-dev \
  -p 6379:6379 \
  redis:7-alpine
```

### 5. Run Database Migrations

```bash
# Run migrations for each service
npm run migrate:auth
npm run migrate:user
npm run migrate:product
npm run migrate:order
npm run migrate:payment
npm run migrate:notification
```

### 6. Start Services

**Option A: Start all services**
```bash
npm run dev:all
```

**Option B: Start services individually**
```bash
# Terminal 1 - API Gateway
cd services/api-gateway
npm run dev

# Terminal 2 - Auth Service
cd services/auth-service
npm run dev

# Terminal 3 - User Service
cd services/user-service
npm run dev

# Continue for other services...
```

### 7. Verify Installation

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check service readiness
curl http://localhost:3000/ready

# Test authentication
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## Docker Compose Deployment

Docker Compose is ideal for local development and testing.

### 1. Build Images

```bash
# Build all service images
docker-compose build

# Build specific service
docker-compose build api-gateway
```

### 2. Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
```

### 3. Service URLs

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| User Service | http://localhost:3002 |
| Product Service | http://localhost:3003 |
| Order Service | http://localhost:3004 |
| Payment Service | http://localhost:3005 |
| Notification Service | http://localhost:3006 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 4. Manage Services

```bash
# Stop services
docker-compose stop

# Start stopped services
docker-compose start

# Restart services
docker-compose restart

# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Scale a service
docker-compose up -d --scale product-service=3
```

### 5. Docker Compose Configuration

Create `docker-compose.yml` at project root:

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: microservices
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # API Gateway
  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - PRODUCT_SERVICE_URL=http://product-service:3003
      - ORDER_SERVICE_URL=http://order-service:3004
      - PAYMENT_SERVICE_URL=http://payment-service:3005
      - NOTIFICATION_SERVICE_URL=http://notification-service:3006
    depends_on:
      - redis
      - auth-service
      - user-service
      - product-service
      - order-service
      - payment-service
      - notification-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Auth Service
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/auth_db
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # User Service
  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - PORT=3002
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/user_db
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Product Service
  product-service:
    build:
      context: ./services/product-service
      dockerfile: Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=development
      - PORT=3003
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/product_db
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Order Service
  order-service:
    build:
      context: ./services/order-service
      dockerfile: Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=development
      - PORT=3004
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/order_db
      - PRODUCT_SERVICE_URL=http://product-service:3003
    depends_on:
      - postgres
      - product-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Payment Service
  payment-service:
    build:
      context: ./services/payment-service
      dockerfile: Dockerfile
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=development
      - PORT=3005
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/payment_db
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Notification Service
  notification-service:
    build:
      context: ./services/notification-service
      dockerfile: Dockerfile
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=development
      - PORT=3006
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/notification_db
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres-data:
  redis-data:
```

## Kubernetes Deployment

### Prerequisites Check

```bash
# Verify kubectl is installed and configured
kubectl version --client

# Verify cluster access
kubectl cluster-info

# Check nodes
kubectl get nodes
```

### 1. Create Namespace

```bash
# Create microservices namespace
kubectl apply -f k8s/base/namespace.yaml

# Verify
kubectl get namespace microservices
```

### 2. Setup Secrets

```bash
# Create secrets from files
kubectl create secret generic api-gateway-secret \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  -n microservices

kubectl create secret generic auth-service-secret \
  --from-literal=DATABASE_URL=postgresql://user:pass@host:5432/auth_db \
  --from-literal=JWT_SECRET=your-jwt-secret \
  -n microservices

# Or apply from YAML (after encoding values)
kubectl apply -f k8s/base/auth-service/secret.yaml
kubectl apply -f k8s/base/user-service/secret.yaml
kubectl apply -f k8s/base/product-service/secret.yaml
kubectl apply -f k8s/base/order-service/secret.yaml
kubectl apply -f k8s/base/payment-service/secret.yaml
kubectl apply -f k8s/base/notification-service/secret.yaml
```

### 3. Create ConfigMaps

```bash
# Apply all ConfigMaps
kubectl apply -f k8s/base/api-gateway/configmap.yaml
kubectl apply -f k8s/base/auth-service/configmap.yaml
kubectl apply -f k8s/base/user-service/configmap.yaml
kubectl apply -f k8s/base/product-service/configmap.yaml
kubectl apply -f k8s/base/order-service/configmap.yaml
kubectl apply -f k8s/base/payment-service/configmap.yaml
kubectl apply -f k8s/base/notification-service/configmap.yaml
```

### 4. Deploy Databases

```bash
# Deploy PostgreSQL instances
kubectl apply -f k8s/databases/

# Verify databases are running
kubectl get statefulsets -n microservices
kubectl get pods -n microservices -l component=database

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l component=database -n microservices --timeout=300s
```

### 5. Deploy Redis

```bash
# Deploy Redis
kubectl apply -f k8s/databases/redis/

# Verify Redis is running
kubectl get pods -n microservices -l app=redis
```

### 6. Deploy Microservices

```bash
# Deploy all services using Kustomize
kubectl apply -k k8s/base/

# Or deploy individually
kubectl apply -f k8s/base/auth-service/deployment.yaml
kubectl apply -f k8s/base/auth-service/service.yaml
kubectl apply -f k8s/base/user-service/deployment.yaml
kubectl apply -f k8s/base/user-service/service.yaml
kubectl apply -f k8s/base/product-service/deployment.yaml
kubectl apply -f k8s/base/product-service/service.yaml
kubectl apply -f k8s/base/order-service/deployment.yaml
kubectl apply -f k8s/base/order-service/service.yaml
kubectl apply -f k8s/base/payment-service/deployment.yaml
kubectl apply -f k8s/base/payment-service/service.yaml
kubectl apply -f k8s/base/notification-service/deployment.yaml
kubectl apply -f k8s/base/notification-service/service.yaml
kubectl apply -f k8s/base/api-gateway/deployment.yaml
kubectl apply -f k8s/base/api-gateway/service.yaml
```

### 7. Setup Horizontal Pod Autoscaling

```bash
# Apply HPA for all services
kubectl apply -f k8s/base/api-gateway/hpa.yaml
kubectl apply -f k8s/base/auth-service/hpa.yaml
kubectl apply -f k8s/base/user-service/hpa.yaml
kubectl apply -f k8s/base/product-service/hpa.yaml
kubectl apply -f k8s/base/order-service/hpa.yaml
kubectl apply -f k8s/base/payment-service/hpa.yaml
kubectl apply -f k8s/base/notification-service/hpa.yaml

# Verify HPA
kubectl get hpa -n microservices
```

### 8. Deploy Ingress

```bash
# Install Nginx Ingress Controller
kubectl apply -f k8s/ingress/nginx-ingress-controller/

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Deploy ingress rules
kubectl apply -f k8s/ingress/ingress.yaml

# Get ingress IP
kubectl get ingress -n microservices
```

### 9. Setup TLS/SSL (cert-manager)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=120s

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f k8s/ingress/cluster-issuer.yaml

# Update ingress with TLS
kubectl apply -f k8s/ingress/ingress-tls.yaml
```

### 10. Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus/

# Deploy Grafana
kubectl apply -f k8s/monitoring/grafana/

# Deploy Prometheus Rules
kubectl apply -f k8s/monitoring/prometheus-rules/

# Verify monitoring stack
kubectl get pods -n microservices -l component=monitoring
```

### 11. Deploy Tracing (Jaeger)

```bash
# Install Jaeger Operator
kubectl apply -f k8s/tracing/jaeger-operator/

# Deploy Jaeger instance
kubectl apply -f k8s/tracing/jaeger-production/

# Verify Jaeger
kubectl get pods -n microservices -l app=jaeger
```

### 12. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n microservices

# Check services
kubectl get services -n microservices

# Check deployments
kubectl get deployments -n microservices

# Check ingress
kubectl get ingress -n microservices

# View logs
kubectl logs -f deployment/api-gateway -n microservices

# Access API Gateway
INGRESS_IP=$(kubectl get ingress -n microservices -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_IP/health
```

### Deployment Diagram

```mermaid
graph TB
    subgraph "Deployment Flow"
        A[Create Namespace] --> B[Setup Secrets]
        B --> C[Create ConfigMaps]
        C --> D[Deploy Databases]
        D --> E[Deploy Redis]
        E --> F[Deploy Microservices]
        F --> G[Setup HPA]
        G --> H[Deploy Ingress]
        H --> I[Setup TLS]
        I --> J[Deploy Monitoring]
        J --> K[Deploy Tracing]
        K --> L[Verify Deployment]
    end
```

## Production Deployment

### Production Checklist

- [ ] **Security**
  - [ ] All secrets stored in secure vault (AWS Secrets Manager, HashiCorp Vault)
  - [ ] TLS/SSL certificates configured
  - [ ] Network policies applied
  - [ ] Pod security policies enforced
  - [ ] RBAC configured
  - [ ] Container images scanned for vulnerabilities

- [ ] **High Availability**
  - [ ] Multi-zone deployment configured
  - [ ] Database replication enabled
  - [ ] Redis sentinel/cluster mode
  - [ ] Load balancer configured
  - [ ] Pod disruption budgets set
  - [ ] Anti-affinity rules applied

- [ ] **Monitoring & Logging**
  - [ ] Prometheus metrics collection
  - [ ] Grafana dashboards configured
  - [ ] Alerting rules set up
  - [ ] Log aggregation configured (ELK/Loki)
  - [ ] Distributed tracing enabled (Jaeger)
  - [ ] APM configured

- [ ] **Backup & Recovery**
  - [ ] Database backup strategy implemented
  - [ ] Backup testing completed
  - [ ] Disaster recovery plan documented
  - [ ] RTO/RPO defined and tested

- [ ] **Performance**
  - [ ] Resource limits optimized
  - [ ] HPA configured and tested
  - [ ] Database indexes created
  - [ ] Caching strategy implemented
  - [ ] CDN configured for static assets

- [ ] **CI/CD**
  - [ ] Automated testing pipeline
  - [ ] Container image building
  - [ ] Automated deployment
  - [ ] Rollback strategy
  - [ ] Canary deployment configured

### Production Environment Setup

#### 1. Use Production-Ready Database

```bash
# AWS RDS PostgreSQL
export DB_HOST=prod-db.xxxxx.us-east-1.rds.amazonaws.com
export DB_PORT=5432
export DB_NAME=microservices
export DB_USER=admin
export DB_PASSWORD=secure-password

# Create databases for each service
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE auth_db;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE user_db;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE product_db;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE order_db;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE payment_db;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE notification_db;"
```

#### 2. Use Production-Ready Redis

```bash
# AWS ElastiCache Redis
export REDIS_HOST=prod-redis.xxxxx.cache.amazonaws.com
export REDIS_PORT=6379
```

#### 3. Configure Production Secrets

```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name microservices/jwt-secret \
  --secret-string "your-production-jwt-secret"

# Or use sealed-secrets for Kubernetes
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
kubectl apply -f sealed-secret.yaml
```

#### 4. Apply Production Overlays

```bash
# Use Kustomize overlays for production
kubectl apply -k k8s/overlays/production/

# This applies production-specific configurations:
# - Higher resource limits
# - More replicas
# - Production secrets
# - Production ConfigMaps
```

#### 5. Configure DNS

```bash
# Point your domain to the ingress load balancer
# Example with AWS Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "INGRESS_HOSTED_ZONE_ID",
          "DNSName": "ingress-lb.elb.amazonaws.com",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

#### 6. Enable Monitoring & Alerts

```bash
# Deploy production monitoring
kubectl apply -f k8s/overlays/production/monitoring/

# Configure Prometheus alerts
kubectl apply -f k8s/monitoring/prometheus-rules/production-alerts.yaml

# Set up notification channels (Slack, PagerDuty, etc.)
```

### Blue-Green Deployment

```bash
# Deploy green environment
kubectl apply -k k8s/overlays/production-green/

# Test green environment
curl https://green.api.yourdomain.com/health

# Switch traffic to green
kubectl patch service api-gateway \
  -n microservices \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switch
kubectl get service api-gateway -n microservices -o yaml

# Remove blue environment
kubectl delete -k k8s/overlays/production-blue/
```

### Canary Deployment

```bash
# Deploy canary with 10% traffic
kubectl apply -f k8s/overlays/production-canary/

# Monitor canary metrics
kubectl top pods -n microservices -l version=canary

# Gradually increase traffic
# 10% -> 25% -> 50% -> 100%

# Rollback if issues detected
kubectl delete -f k8s/overlays/production-canary/
```

## Environment Configuration

### Environment Variables

#### API Gateway
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=***
JWT_SECRET=***
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
PRODUCT_SERVICE_URL=http://product-service:3003
ORDER_SERVICE_URL=http://order-service:3004
PAYMENT_SERVICE_URL=http://payment-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3006
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
JAEGER_AGENT_HOST=jaeger-agent
JAEGER_AGENT_PORT=6831
```

#### Service Template
```bash
NODE_ENV=production
PORT=300X
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@host:5432/db_name
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
JAEGER_AGENT_HOST=jaeger-agent
JAEGER_AGENT_PORT=6831
METRICS_PORT=9090
```

### ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-config
  namespace: microservices
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  AUTH_SERVICE_URL: "http://auth-service:3001"
  USER_SERVICE_URL: "http://user-service:3002"
  PRODUCT_SERVICE_URL: "http://product-service:3003"
  ORDER_SERVICE_URL: "http://order-service:3004"
  PAYMENT_SERVICE_URL: "http://payment-service:3005"
  NOTIFICATION_SERVICE_URL: "http://notification-service:3006"
  CORS_ORIGIN: "https://yourdomain.com"
  RATE_LIMIT_WINDOW: "60000"
  RATE_LIMIT_MAX_REQUESTS: "100"
```

### Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-gateway-secret
  namespace: microservices
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  REDIS_PASSWORD: <base64-encoded-password>
```

```bash
# Create base64 encoded values
echo -n 'your-secret' | base64
```

## Scaling Strategies

### Horizontal Pod Autoscaling (HPA)

#### Metrics-Based Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
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
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
```

#### Custom Metrics Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

### Vertical Pod Autoscaling (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: product-service-vpa
  namespace: microservices
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: product-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
```

### Cluster Autoscaling

```bash
# AWS EKS Cluster Autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure node groups
# Min nodes: 3, Max nodes: 20
```

### Database Scaling

#### Read Replicas
```bash
# Create read replica for PostgreSQL
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-db-read-replica-1 \
  --source-db-instance-identifier prod-db-master \
  --db-instance-class db.r5.xlarge \
  --availability-zone us-east-1b
```

#### Connection Pooling
```javascript
// Configure PgBouncer or connection pool in application
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n microservices

# Describe pod for events
kubectl describe pod <pod-name> -n microservices

# Check logs
kubectl logs <pod-name> -n microservices

# Common causes:
# - Image pull errors: Check image name and registry credentials
# - Configuration errors: Check ConfigMaps and Secrets
# - Resource limits: Check if node has enough resources
# - Liveness probe failures: Check application health endpoint
```

#### Service Not Accessible

```bash
# Check service
kubectl get svc -n microservices

# Test service from within cluster
kubectl run test-pod --rm -it --image=alpine -- sh
apk add curl
curl http://api-gateway.microservices.svc.cluster.local:3000/health

# Check endpoints
kubectl get endpoints api-gateway -n microservices

# Common causes:
# - Selector mismatch: Check service selector matches pod labels
# - Port mismatch: Verify targetPort matches container port
# - NetworkPolicy: Check if network policies are blocking traffic
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run pg-test --rm -it --image=postgres:15 -- bash
psql -h postgres-service -U postgres -d auth_db

# Check database service
kubectl get svc postgres-service -n microservices

# Check database logs
kubectl logs statefulset/postgres -n microservices

# Common causes:
# - Wrong connection string
# - Database not ready
# - Network policy blocking connection
# - Authentication failure
```

#### High Memory Usage

```bash
# Check pod resource usage
kubectl top pods -n microservices

# Check node resource usage
kubectl top nodes

# Identify memory leaks
kubectl logs <pod-name> -n microservices | grep -i "memory\|heap"

# Solutions:
# - Increase memory limits
# - Fix memory leaks in application
# - Enable garbage collection tuning
# - Scale horizontally
```

#### Slow Performance

```bash
# Check response times
kubectl logs api-gateway -n microservices | grep "response_time"

# Check Prometheus metrics
kubectl port-forward -n microservices svc/prometheus 9090:9090
# Open http://localhost:9090

# Check database query performance
# Run EXPLAIN ANALYZE on slow queries

# Solutions:
# - Add database indexes
# - Enable caching
# - Optimize queries
# - Scale services
# - Check network latency
```

### Debugging Commands

```bash
# Execute command in pod
kubectl exec -it <pod-name> -n microservices -- sh

# Port forward to local machine
kubectl port-forward -n microservices svc/api-gateway 3000:3000

# Copy files from pod
kubectl cp microservices/<pod-name>:/app/logs ./logs

# View events
kubectl get events -n microservices --sort-by='.lastTimestamp'

# Check resource quotas
kubectl get resourcequota -n microservices

# Check network policies
kubectl get networkpolicies -n microservices

# Rollback deployment
kubectl rollout undo deployment/api-gateway -n microservices

# Scale deployment
kubectl scale deployment api-gateway --replicas=5 -n microservices
```

### Health Check Endpoints

Test these endpoints for troubleshooting:

| Endpoint | Purpose |
|----------|---------|
| `/health` | Application health status |
| `/ready` | Readiness for traffic |
| `/metrics` | Prometheus metrics |
| `/info` | Application info and version |

```bash
# Test health endpoint
curl http://<service-url>/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-15T16:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Rollback Procedure

```bash
# View rollout history
kubectl rollout history deployment/api-gateway -n microservices

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n microservices

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n microservices

# Check rollout status
kubectl rollout status deployment/api-gateway -n microservices
```

### Disaster Recovery

```bash
# Backup all Kubernetes resources
kubectl get all -n microservices -o yaml > backup.yaml

# Backup databases
kubectl exec statefulset/postgres -n microservices -- \
  pg_dumpall -U postgres > backup.sql

# Restore from backup
kubectl apply -f backup.yaml
kubectl exec -i statefulset/postgres -n microservices -- \
  psql -U postgres < backup.sql
```

## Useful Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)

# Module 14: Production-Ready Best Practices

## Overview

Taking systems to production requires more than functionality. This module covers production readiness, high availability, disaster recovery, performance optimization, security hardening, and operational excellence.

## Learning Objectives

- ✅ Apply production readiness checklist
- ✅ Implement high availability architecture
- ✅ Design for scalability
- ✅ Plan disaster recovery
- ✅ Optimize performance
- ✅ Ensure security compliance

## Production Readiness Checklist

### Infrastructure

- [ ] **Multi-zone deployment**: Services across availability zones
- [ ] **Auto-scaling configured**: HPA with proper thresholds
- [ ] **Load balancing**: Distribute traffic evenly
- [ ] **CDN for static assets**: Reduce latency
- [ ] **Database replication**: Master-slave or multi-master
- [ ] **Automated backups**: Regular, tested backups
- [ ] **Disaster recovery plan**: Documented and tested

### Monitoring & Observability

- [ ] **Comprehensive metrics**: Golden signals (latency, traffic, errors, saturation)
- [ ] **Log aggregation**: Centralized logging
- [ ] **Distributed tracing**: Request flow visibility
- [ ] **Alerting rules**: Critical alerts configured
- [ ] **On-call rotation**: Team responsible for incidents
- [ ] **Runbooks**: Documented incident response
- [ ] **Dashboards**: Service health at a glance

### Security

- [ ] **TLS everywhere**: HTTPS/mTLS for all communication
- [ ] **Secrets management**: Vault, AWS Secrets Manager, etc.
- [ ] **Network policies**: Pod-to-pod access control
- [ ] **Security scanning**: Container and dependency vulnerabilities
- [ ] **Penetration testing**: Regular security audits
- [ ] **Audit logging**: Track all access
- [ ] **RBAC configured**: Principle of least privilege

### Testing

- [ ] **Unit tests**: 80%+ coverage
- [ ] **Integration tests**: Service interactions
- [ ] **E2E tests**: Critical user flows
- [ ] **Load tests**: Handle expected traffic
- [ ] **Chaos engineering**: Failure scenarios tested

### Documentation

- [ ] **Architecture diagrams**: System design documented
- [ ] **API documentation**: OpenAPI/Swagger
- [ ] **Deployment guides**: Step-by-step instructions
- [ ] **Runbooks**: Operational procedures
- [ ] **Incident playbooks**: Response procedures

## High Availability Architecture

### Multi-Zone Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 6
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - user-service
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: user-service
        image: user-service:1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Database High Availability

```yaml
# PostgreSQL with replication
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-replica
  annotations:
    service.alpha.kubernetes.io/tolerate-unready-endpoints: "true"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_REPLICATION_MODE
          value: "master"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Scaling Strategies

### Horizontal Scaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 50
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
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Vertical Scaling (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: user-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: user-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup-databases.sh

# Backup all databases
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# PostgreSQL backup
kubectl exec -n production postgres-0 -- \
  pg_dumpall -U postgres | gzip > $BACKUP_DIR/postgres-backup.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/postgres-backup.sql.gz \
  s3://backups/postgres/$(date +%Y%m%d)/

# Retain backups for 30 days
find /backups -type f -mtime +30 -delete

# Test restore (to staging)
gunzip -c $BACKUP_DIR/postgres-backup.sql.gz | \
  kubectl exec -i -n staging postgres-0 -- psql -U postgres
```

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

```
RTO: Maximum acceptable downtime
  - Critical services: 15 minutes
  - Non-critical services: 4 hours

RPO: Maximum acceptable data loss
  - Transactional data: 5 minutes (continuous replication)
  - Analytics data: 24 hours (daily backups)
```

## Performance Optimization

### Caching Strategy

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getUser(userId: string) {
  // Try cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const user = await userRepository.findById(userId);

  // Cache for 1 hour
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

  return user;
}

// Cache invalidation
async function updateUser(userId: string, data: Partial<User>) {
  const user = await userRepository.update(userId, data);

  // Invalidate cache
  await redis.del(`user:${userId}`);

  return user;
}
```

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status != 'completed';

-- Analyze query performance
EXPLAIN ANALYZE
SELECT o.*, u.name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 20;

-- Vacuum and analyze
VACUUM ANALYZE orders;
```

### Connection Pooling

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20, // Maximum pool size
  min: 5,  // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Load Testing

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

## Security Hardening

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: app:1.0.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: user-service-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: user-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3002
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

## Capacity Planning

```typescript
// Calculate required resources

// Expected load
const requestsPerSecond = 1000;
const avgRequestDuration = 0.05; // 50ms
const peakMultiplier = 3; // 3x during peak

// Required concurrent handlers
const concurrentRequests = requestsPerSecond * avgRequestDuration * peakMultiplier;

// Pods needed (each handles 10 concurrent)
const podsNeeded = Math.ceil(concurrentRequests / 10);

console.log(`Pods needed: ${podsNeeded}`);
```

## Cost Optimization

### Right-Sizing Resources

```bash
# Analyze actual resource usage
kubectl top pods -n production

# Adjust resources based on usage
kubectl set resources deployment/user-service \
  --requests=cpu=200m,memory=256Mi \
  --limits=cpu=500m,memory=512Mi
```

### Spot Instances

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  template:
    spec:
      nodeSelector:
        node.kubernetes.io/instance-type: spot
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

## Capstone Project Requirements

Build a complete production-ready e-commerce platform:

### Services (minimum 5)
- API Gateway
- User Service
- Product Service
- Order Service
- Payment Service

### Requirements
- ✅ All services containerized
- ✅ Kubernetes deployments
- ✅ Service mesh configured
- ✅ Comprehensive monitoring
- ✅ CI/CD pipeline
- ✅ 80%+ test coverage
- ✅ Load tested (1000+ RPS)
- ✅ Security hardened
- ✅ Documentation complete

### Performance Targets
- 99.9% uptime
- p95 latency < 500ms
- Handle 1000 RPS
- Scale to 10,000 RPS

## Summary

- ✅ Production readiness checklist
- ✅ High availability architecture
- ✅ Disaster recovery planning
- ✅ Performance optimization
- ✅ Security hardening
- ✅ Capacity planning
- ✅ Cost optimization

## Next Steps

1. Review [checklist.md](./checklist.md)
2. Study [case-studies.md](./case-studies.md)
3. Complete [capstone-project.md](./capstone-project.md)
4. Deploy your production system!

## Congratulations!

You've completed the Cloud-Native Microservices course! You now have the skills to design, build, deploy, and operate production-grade microservices platforms. Keep learning, building, and sharing your knowledge with the community.

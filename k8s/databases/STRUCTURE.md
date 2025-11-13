# Database Infrastructure Structure

## File Count Summary

Total YAML files: 38
- Common files: 2 (storage-class.yaml, kustomization.yaml)
- Per-database files: 6 files × 6 databases = 36 files
- Documentation: 2 (README.md, STRUCTURE.md)

## Directory Tree

```
k8s/databases/
├── README.md                       # Comprehensive documentation
├── STRUCTURE.md                    # This file
├── storage-class.yaml              # Fast SSD storage class (AWS/GCP/Azure)
├── kustomization.yaml              # Kustomize configuration for all databases
│
├── auth-db/
│   ├── secret.yaml                 # Database credentials (EXAMPLE - replace in production)
│   ├── configmap.yaml              # PostgreSQL config + init/backup/restore scripts
│   ├── pvc.yaml                    # Backup volume + WAL archive volume
│   ├── service.yaml                # Headless + ClusterIP + Read-only services
│   ├── statefulset.yaml            # 3-replica StatefulSet with PostgreSQL 16
│   └── backup-cronjob.yaml         # Daily backup + WAL cleanup jobs
│
├── user-db/                        # Same structure as auth-db
│   ├── secret.yaml
│   ├── configmap.yaml
│   ├── pvc.yaml
│   ├── service.yaml
│   ├── statefulset.yaml
│   └── backup-cronjob.yaml
│
├── product-db/                     # Same structure as auth-db
│   ├── secret.yaml
│   ├── configmap.yaml
│   ├── pvc.yaml
│   ├── service.yaml
│   ├── statefulset.yaml
│   └── backup-cronjob.yaml
│
├── order-db/                       # Same structure as auth-db
│   ├── secret.yaml
│   ├── configmap.yaml
│   ├── pvc.yaml
│   ├── service.yaml
│   ├── statefulset.yaml
│   └── backup-cronjob.yaml
│
├── payment-db/                     # Same structure as auth-db
│   ├── secret.yaml
│   ├── configmap.yaml
│   ├── pvc.yaml
│   ├── service.yaml
│   ├── statefulset.yaml
│   └── backup-cronjob.yaml
│
└── notification-db/                # Same structure as auth-db
    ├── secret.yaml
    ├── configmap.yaml
    ├── pvc.yaml
    ├── service.yaml
    ├── statefulset.yaml
    └── backup-cronjob.yaml
```

## Resource Breakdown

### Per Database Instance (6 databases)

**Kubernetes Resources Created:**
- 1 StatefulSet (3 replicas each)
- 3 Services (headless, clusterIP, readonly)
- 2 PersistentVolumeClaims (backup, WAL archive)
- 3 PVCs auto-created by StatefulSet volumeClaimTemplates (data volumes)
- 1 ConfigMap (configuration + scripts)
- 1 Secret (credentials)
- 2 CronJobs (backup, WAL cleanup)

**Total per database:** 15 resource objects
**Total for all 6 databases:** 90 resource objects

### Storage Allocation

**Per Database:**
- Data: 3 × 10Gi = 30Gi (3 replicas)
- Backups: 50Gi
- WAL Archive: 20Gi
- **Subtotal: 100Gi per database**

**Total Storage (all 6 databases):** 600Gi

### Compute Resources

**Per Database Pod (3 pods per database):**
- CPU Request: 500m
- CPU Limit: 2000m
- Memory Request: 512Mi
- Memory Limit: 2Gi

**Per Database (3 replicas):**
- CPU Request: 1500m (1.5 cores)
- CPU Limit: 6000m (6 cores)
- Memory Request: 1536Mi (1.5Gi)
- Memory Limit: 6Gi

**Total (all 6 databases with 3 replicas each = 18 pods):**
- CPU Request: 9 cores
- CPU Limit: 36 cores
- Memory Request: 9Gi
- Memory Limit: 36Gi

### Additional Resources (Metrics Sidecar)

**Per Metrics Container:**
- CPU Request: 100m
- CPU Limit: 500m
- Memory Request: 128Mi
- Memory Limit: 256Mi

**Total Metrics (18 pods):**
- CPU Request: 1800m (1.8 cores)
- CPU Limit: 9000m (9 cores)
- Memory Request: 2304Mi (2.25Gi)
- Memory Limit: 4608Mi (4.5Gi)

## Key Features

### High Availability
- 3 replicas per database
- Pod anti-affinity across nodes and zones
- Automatic pod rescheduling
- Health probes for automatic recovery

### Data Persistence
- Persistent volumes with fast SSD storage
- Volume claim templates for automatic PVC creation
- Backup volumes for disaster recovery
- WAL archiving for point-in-time recovery

### Backup Strategy
- Automated daily backups (2 AM)
- Compressed backups (pg_dump + gzip)
- 7-day retention policy
- Backup verification
- Metadata tracking
- WAL cleanup jobs

### Security
- Example secrets (must be replaced)
- PostgreSQL authentication (md5)
- Replication user isolation
- Security contexts
- Non-root containers

### Monitoring
- PostgreSQL exporter sidecar
- Prometheus metrics on port 9187
- Health check endpoints
- Detailed logging

### Configuration
- Custom postgresql.conf
- Custom pg_hba.conf
- Database initialization scripts
- Backup and restore scripts
- Common PostgreSQL extensions

## Database Services

Each database exposes three services:

1. **Headless Service** (`{service}-db-postgresql-headless`)
   - For StatefulSet pod discovery
   - Stable network identity
   - No load balancing

2. **ClusterIP Service** (`{service}-db-postgresql`)
   - For application connections
   - Load balanced across all replicas
   - Ports: 5432 (PostgreSQL), 9187 (metrics)

3. **Read-Only Service** (`{service}-db-postgresql-readonly`)
   - For read-only queries (optional)
   - Can be configured with replica selector
   - Load distribution for read operations

## Connection Strings

Applications can connect using:

```
# Primary (read-write)
postgresql://{user}:{password}@{service}-db-postgresql:5432/{dbname}

# Examples:
postgresql://authuser:password@auth-db-postgresql:5432/authdb
postgresql://useruser:password@user-db-postgresql:5432/userdb
postgresql://productuser:password@product-db-postgresql:5432/productdb
postgresql://orderuser:password@order-db-postgresql:5432/orderdb
postgresql://paymentuser:password@payment-db-postgresql:5432/paymentdb
postgresql://notificationuser:password@notification-db-postgresql:5432/notificationdb
```

## Deployment Order

1. Storage class
2. Secrets (generate secure passwords first!)
3. ConfigMaps
4. PVCs
5. Services
6. StatefulSets
7. CronJobs

Or simply: `kubectl apply -k k8s/databases/`

## Quick Commands

```bash
# Deploy everything
kubectl apply -k k8s/databases/

# Check status
kubectl get statefulsets -l app.kubernetes.io/component=database
kubectl get pods -l app.kubernetes.io/component=database
kubectl get pvc -l app.kubernetes.io/component=database

# View logs
kubectl logs -l app.kubernetes.io/name=auth-db -c postgresql --tail=50

# Check backups
kubectl get cronjobs -l app.kubernetes.io/component=database-backup

# Connect to database
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb

# Monitor resources
kubectl top pods -l app.kubernetes.io/component=database
```

## Production Readiness

✅ High availability (3 replicas)
✅ Persistent storage
✅ Automated backups
✅ Health monitoring
✅ Resource limits
✅ Pod anti-affinity
✅ Prometheus metrics
✅ Init containers
✅ Graceful shutdown
✅ Security contexts

⚠️ Required before production:
- Replace example secrets with secure credentials
- Configure storage class for your cloud provider
- Set up monitoring alerts
- Test backup/restore procedures
- Configure network policies
- Enable TLS/SSL
- Implement automatic failover (Patroni/Stolon)
- Set up replication monitoring

---

Generated: 2025-11-13

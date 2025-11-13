# PostgreSQL Databases for Microservices

This directory contains production-ready PostgreSQL StatefulSet configurations for all microservices in the system.

## Overview

The system includes **6 dedicated PostgreSQL databases**, one for each microservice:

1. **auth-db** - Authentication service database
2. **user-db** - User service database
3. **product-db** - Product service database
4. **order-db** - Order service database
5. **payment-db** - Payment service database
6. **notification-db** - Notification service database

## Architecture

Each database deployment includes:

- **3 replicas** for high availability
- **PostgreSQL 16 Alpine** (official image)
- **10Gi persistent storage** per replica with fast SSD storage class
- **Pod anti-affinity** to spread replicas across different nodes
- **Resource limits** (CPU: 500m-2000m, Memory: 512Mi-2Gi)
- **Health probes** (liveness, readiness, and startup)
- **Automatic backups** via CronJobs (daily at 2 AM)
- **7-day backup retention** policy
- **PostgreSQL exporter** for Prometheus metrics
- **WAL archiving** configuration for point-in-time recovery

## Directory Structure

```
databases/
├── storage-class.yaml              # Fast SSD storage class for all databases
├── kustomization.yaml              # Kustomize configuration for all databases
│
├── auth-db/
│   ├── secret.yaml                 # Database credentials (example)
│   ├── configmap.yaml              # PostgreSQL config and init scripts
│   ├── pvc.yaml                    # Backup and WAL archive volumes
│   ├── service.yaml                # Headless + ClusterIP services
│   ├── statefulset.yaml            # Main StatefulSet configuration
│   └── backup-cronjob.yaml         # Daily backup job + WAL cleanup
│
├── user-db/                        # Same structure as auth-db
├── product-db/                     # Same structure as auth-db
├── order-db/                       # Same structure as auth-db
├── payment-db/                     # Same structure as auth-db
└── notification-db/                # Same structure as auth-db
```

## Quick Start

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Storage provisioner available
- At least 3 nodes for proper anti-affinity

### Deploy All Databases

```bash
# Deploy all databases at once
kubectl apply -k k8s/databases/

# Or use kustomize build first (recommended for review)
kustomize build k8s/databases/ | kubectl apply -f -
```

### Deploy Individual Database

```bash
# Deploy only auth database
kubectl apply -f k8s/databases/auth-db/

# Or specific resources
kubectl apply -f k8s/databases/auth-db/secret.yaml
kubectl apply -f k8s/databases/auth-db/configmap.yaml
kubectl apply -f k8s/databases/auth-db/pvc.yaml
kubectl apply -f k8s/databases/auth-db/service.yaml
kubectl apply -f k8s/databases/auth-db/statefulset.yaml
kubectl apply -f k8s/databases/auth-db/backup-cronjob.yaml
```

## Configuration

### Database Credentials

**⚠️ SECURITY WARNING**: The secret files are examples only. In production:

1. **Never commit secrets to version control**
2. Use one of these solutions:
   - [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
   - [External Secrets Operator](https://external-secrets.io/)
   - [HashiCorp Vault](https://www.vaultproject.io/)
   - Cloud provider secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)

#### Generate Strong Passwords

```bash
# Generate random password
openssl rand -base64 32

# Create secret from command line
kubectl create secret generic auth-db-secret \
  --from-literal=POSTGRES_USER=authuser \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=POSTGRES_DB=authdb \
  --from-literal=POSTGRES_REPLICATION_USER=replicator \
  --from-literal=POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Storage Class Configuration

The `storage-class.yaml` provides configurations for different cloud providers:

- **AWS**: `gp3` SSD with 3000 IOPS
- **GCP**: `pd-ssd` (commented out)
- **Azure**: `Premium_LRS` (commented out)

Update the storage class based on your cloud provider before deployment.

### PostgreSQL Configuration

Key configuration settings in `configmap.yaml`:

- **Connections**: 200 max connections
- **Memory**: 256MB shared buffers, 1GB effective cache
- **WAL**: Enabled for replication with compression
- **Replication**: Up to 10 wal senders and replication slots
- **Logging**: Detailed logging with rotation
- **Extensions**: uuid-ossp, pgcrypto, pg_stat_statements

## Operations

### Check Database Status

```bash
# Check all database pods
kubectl get statefulsets -l app.kubernetes.io/component=database
kubectl get pods -l app.kubernetes.io/component=database

# Check specific database
kubectl get pods -l app.kubernetes.io/name=auth-db

# View logs
kubectl logs auth-db-postgresql-0 -c postgresql
kubectl logs auth-db-postgresql-0 -c metrics

# Check PVCs
kubectl get pvc -l app.kubernetes.io/component=database
```

### Connect to Database

```bash
# Connect to primary (pod 0)
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb

# Connect via port-forward
kubectl port-forward svc/auth-db-postgresql 5432:5432
psql -h localhost -U authuser -d authdb

# Get connection string from secret
kubectl get secret auth-db-secret -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

### Scaling

```bash
# Scale up/down (be careful with stateful data!)
kubectl scale statefulset auth-db-postgresql --replicas=5

# Rolling update
kubectl rollout status statefulset/auth-db-postgresql
kubectl rollout restart statefulset/auth-db-postgresql
```

### Backups

#### Automatic Backups

Backups run automatically via CronJob:
- **Schedule**: Daily at 2:00 AM
- **Location**: `/backups` on backup PVC
- **Format**: Compressed SQL dump (`.sql.gz`)
- **Retention**: 7 days

```bash
# Check backup jobs
kubectl get cronjobs -l app.kubernetes.io/component=database-backup

# View backup job history
kubectl get jobs -l app.kubernetes.io/component=database-backup

# Manually trigger backup
kubectl create job --from=cronjob/auth-db-backup auth-db-backup-manual

# List backups
kubectl exec -it auth-db-postgresql-0 -- ls -lh /backups/
```

#### Manual Backup

```bash
# Create manual backup
kubectl exec -it auth-db-postgresql-0 -- bash -c '
  pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -F c -f /backups/manual-backup-$(date +%Y%m%d-%H%M%S).dump
'

# Copy backup to local machine
kubectl cp auth-db-postgresql-0:/backups/auth-db-backup-20240101_020000.sql.gz ./auth-db-backup.sql.gz
```

### Restore from Backup

**⚠️ WARNING**: This operation will delete existing data!

```bash
# 1. Stop all applications using the database
kubectl scale deployment auth-service --replicas=0

# 2. Scale down StatefulSet to 1 replica
kubectl scale statefulset auth-db-postgresql --replicas=1

# 3. Wait for scale down
kubectl wait --for=delete pod/auth-db-postgresql-1 --timeout=120s
kubectl wait --for=delete pod/auth-db-postgresql-2 --timeout=120s

# 4. Restore from backup
kubectl exec -it auth-db-postgresql-0 -- bash -c '
  export BACKUP_FILE=/backups/auth-db-backup-20240101_020000.sql.gz

  # Terminate all connections
  psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''$POSTGRES_DB'\'';"

  # Drop and recreate database
  psql -U postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
  psql -U postgres -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"

  # Restore
  gunzip -c $BACKUP_FILE | pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -v
'

# 5. Verify restore
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb -c "\dt"

# 6. Scale back up
kubectl scale statefulset auth-db-postgresql --replicas=3
kubectl scale deployment auth-service --replicas=3
```

## Monitoring

### Prometheus Metrics

Each database pod includes a PostgreSQL exporter sidecar container:

- **Port**: 9187
- **Endpoint**: `/metrics`
- **Image**: `prometheuscommunity/postgres-exporter:v0.15.0`

### Key Metrics to Monitor

```promql
# Database connections
pg_stat_database_numbackends{datname="authdb"}

# Transaction rate
rate(pg_stat_database_xact_commit{datname="authdb"}[5m])

# Database size
pg_database_size_bytes{datname="authdb"}

# Replication lag
pg_replication_lag

# Cache hit ratio
pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)
```

### Health Checks

```bash
# Check health probes
kubectl describe pod auth-db-postgresql-0 | grep -A 5 "Liveness\|Readiness\|Startup"

# Manual health check
kubectl exec -it auth-db-postgresql-0 -- pg_isready -U authuser -d authdb
```

## High Availability

### Replication Setup

The configuration supports PostgreSQL streaming replication:

1. **Primary**: First pod (auth-db-postgresql-0)
2. **Replicas**: Additional pods (auth-db-postgresql-1, auth-db-postgresql-2)
3. **Automatic failover**: Requires additional tooling (see below)

### Automatic Failover (Optional)

For production, consider implementing:

- [Patroni](https://github.com/zalando/patroni) - HA solution for PostgreSQL
- [Stolon](https://github.com/sorintlab/stolon) - Cloud native PostgreSQL HA
- [CloudNativePG Operator](https://cloudnative-pg.io/) - Kubernetes operator for PostgreSQL

### Pod Anti-Affinity

Ensures pods are spread across different nodes:

```yaml
podAntiAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    - topologyKey: kubernetes.io/hostname  # Different nodes
  preferredDuringSchedulingIgnoredDuringExecution:
    - topologyKey: topology.kubernetes.io/zone  # Different zones
```

## Troubleshooting

### Pod Won't Start

```bash
# Check pod events
kubectl describe pod auth-db-postgresql-0

# Check logs
kubectl logs auth-db-postgresql-0 -c postgresql
kubectl logs auth-db-postgresql-0 -c init-chmod-data

# Check PVC binding
kubectl get pvc
kubectl describe pvc data-auth-db-postgresql-0
```

### Connection Issues

```bash
# Test connection from another pod
kubectl run -it --rm psql-test --image=postgres:16-alpine -- \
  psql -h auth-db-postgresql -U authuser -d authdb

# Check service endpoints
kubectl get endpoints auth-db-postgresql

# Check service
kubectl describe service auth-db-postgresql
```

### Performance Issues

```bash
# Check resource usage
kubectl top pod auth-db-postgresql-0

# Check slow queries
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Check connections
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

### Data Corruption

```bash
# Check data integrity
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb -c "
  SELECT datname, pg_size_pretty(pg_database_size(datname))
  FROM pg_database;
"

# Vacuum and analyze
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb -c "VACUUM ANALYZE;"
```

## Cleanup

### Delete All Databases

**⚠️ WARNING**: This will delete all data!

```bash
# Delete all database resources
kubectl delete -k k8s/databases/

# Delete PVCs (optional - data will be lost!)
kubectl delete pvc -l app.kubernetes.io/component=database
```

### Delete Individual Database

```bash
# Delete specific database
kubectl delete -f k8s/databases/auth-db/

# Delete specific PVCs
kubectl delete pvc data-auth-db-postgresql-0
kubectl delete pvc data-auth-db-postgresql-1
kubectl delete pvc data-auth-db-postgresql-2
kubectl delete pvc auth-db-backup-pvc
```

## Production Checklist

- [ ] Update storage class for your cloud provider
- [ ] Generate and secure database credentials
- [ ] Configure backup storage location
- [ ] Set up monitoring and alerting
- [ ] Test backup and restore procedures
- [ ] Configure network policies
- [ ] Set up TLS/SSL for connections
- [ ] Implement automatic failover solution
- [ ] Configure resource quotas
- [ ] Set up log aggregation
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common operations
- [ ] Configure pod disruption budgets
- [ ] Review and adjust resource limits
- [ ] Set up replication monitoring

## Security Best Practices

1. **Never commit secrets to Git**
2. Use strong, randomly generated passwords
3. Enable TLS for client connections
4. Configure network policies to restrict access
5. Use Pod Security Standards
6. Regularly update PostgreSQL images
7. Enable audit logging
8. Implement least privilege access
9. Encrypt data at rest
10. Regular security scanning

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
- [Kustomize Documentation](https://kustomize.io/)

## Support

For issues or questions:
1. Check logs: `kubectl logs <pod-name>`
2. Review events: `kubectl describe <resource>`
3. Check documentation above
4. Contact DevOps team

---

**Last Updated**: 2025-11-13
**Maintained By**: DevOps Team

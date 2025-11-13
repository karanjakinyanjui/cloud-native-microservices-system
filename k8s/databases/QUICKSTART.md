# PostgreSQL Databases - Quick Start Guide

## Connection Strings for Services

Use these connection strings in your microservice configurations:

### Auth Service
```bash
DATABASE_URL=postgresql://authuser:PASSWORD@auth-db-postgresql:5432/authdb
```

### User Service
```bash
DATABASE_URL=postgresql://useruser:PASSWORD@user-db-postgresql:5432/userdb
```

### Product Service
```bash
DATABASE_URL=postgresql://productuser:PASSWORD@product-db-postgresql:5432/productdb
```

### Order Service
```bash
DATABASE_URL=postgresql://orderuser:PASSWORD@order-db-postgresql:5432/orderdb
```

### Payment Service
```bash
DATABASE_URL=postgresql://paymentuser:PASSWORD@payment-db-postgresql:5432/paymentdb
```

### Notification Service
```bash
DATABASE_URL=postgresql://notificationuser:PASSWORD@notification-db-postgresql:5432/notificationdb
```

## Quick Commands

### Deploy

```bash
# Deploy all databases at once
kubectl apply -k k8s/databases/

# Or deploy individually
kubectl apply -f k8s/databases/auth-db/
kubectl apply -f k8s/databases/user-db/
kubectl apply -f k8s/databases/product-db/
kubectl apply -f k8s/databases/order-db/
kubectl apply -f k8s/databases/payment-db/
kubectl apply -f k8s/databases/notification-db/
```

### Check Status

```bash
# All databases
kubectl get statefulsets -l app.kubernetes.io/component=database
kubectl get pods -l app.kubernetes.io/component=database
kubectl get pvc -l app.kubernetes.io/component=database

# Specific database
kubectl get pods -l app.kubernetes.io/name=auth-db
kubectl get pods -l app.kubernetes.io/name=user-db
kubectl get pods -l app.kubernetes.io/name=product-db
kubectl get pods -l app.kubernetes.io/name=order-db
kubectl get pods -l app.kubernetes.io/name=payment-db
kubectl get pods -l app.kubernetes.io/name=notification-db
```

### Connect to Database

```bash
# Auth database
kubectl exec -it auth-db-postgresql-0 -- psql -U authuser -d authdb

# User database
kubectl exec -it user-db-postgresql-0 -- psql -U useruser -d userdb

# Product database
kubectl exec -it product-db-postgresql-0 -- psql -U productuser -d productdb

# Order database
kubectl exec -it order-db-postgresql-0 -- psql -U orderuser -d orderdb

# Payment database
kubectl exec -it payment-db-postgresql-0 -- psql -U paymentuser -d paymentdb

# Notification database
kubectl exec -it notification-db-postgresql-0 -- psql -U notificationuser -d notificationdb
```

### Port Forward (for local access)

```bash
# Auth database
kubectl port-forward svc/auth-db-postgresql 5432:5432
# Then connect: psql -h localhost -U authuser -d authdb

# User database
kubectl port-forward svc/user-db-postgresql 5433:5432
# Then connect: psql -h localhost -p 5433 -U useruser -d userdb

# And so on for other databases...
```

### View Logs

```bash
# Auth database
kubectl logs auth-db-postgresql-0 -c postgresql --tail=100 -f

# User database
kubectl logs user-db-postgresql-0 -c postgresql --tail=100 -f

# Check backup job logs
kubectl logs -l app.kubernetes.io/component=database-backup --tail=50
```

### Backup Operations

```bash
# Check backup CronJobs
kubectl get cronjobs -l app.kubernetes.io/component=database-backup

# Manually trigger backup for auth database
kubectl create job --from=cronjob/auth-db-backup auth-db-backup-manual-$(date +%s)

# List backups
kubectl exec -it auth-db-postgresql-0 -- ls -lh /backups/

# Download backup to local machine
kubectl cp auth-db-postgresql-0:/backups/auth-db-backup-20251113_020000.sql.gz ./backup.sql.gz
```

### Scaling

```bash
# Scale up to 5 replicas (be careful!)
kubectl scale statefulset auth-db-postgresql --replicas=5

# Scale down to 1 replica
kubectl scale statefulset auth-db-postgresql --replicas=1
```

### Monitoring

```bash
# Check resource usage
kubectl top pods -l app.kubernetes.io/component=database

# Get Prometheus metrics
kubectl port-forward svc/auth-db-postgresql 9187:9187
curl http://localhost:9187/metrics
```

### Troubleshooting

```bash
# Check pod events
kubectl describe pod auth-db-postgresql-0

# Check StatefulSet status
kubectl describe statefulset auth-db-postgresql

# Check PVC status
kubectl get pvc
kubectl describe pvc data-auth-db-postgresql-0

# Check services
kubectl get svc -l app.kubernetes.io/component=database
kubectl describe svc auth-db-postgresql
```

### Cleanup

```bash
# Delete all databases (WARNING: DATA LOSS!)
kubectl delete -k k8s/databases/

# Delete specific database
kubectl delete -f k8s/databases/auth-db/

# Delete only pods (PVCs remain)
kubectl delete statefulset auth-db-postgresql

# Delete including PVCs (DATA LOSS!)
kubectl delete statefulset auth-db-postgresql
kubectl delete pvc -l app.kubernetes.io/name=auth-db
```

## Before Production

1. **Generate secure passwords:**
   ```bash
   # Generate random password
   openssl rand -base64 32

   # Update each secret
   kubectl create secret generic auth-db-secret \
     --from-literal=POSTGRES_USER=authuser \
     --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
     --from-literal=POSTGRES_DB=authdb \
     --from-literal=POSTGRES_REPLICATION_USER=replicator \
     --from-literal=POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32) \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. **Update storage class** in `storage-class.yaml` for your cloud provider

3. **Test backup/restore** procedures

4. **Set up monitoring** and alerts

5. **Configure network policies**

6. **Enable TLS/SSL** for connections

## Database Service Endpoints

| Database | Service Name | Port | Description |
|----------|-------------|------|-------------|
| Auth | `auth-db-postgresql` | 5432 | Read/Write access |
| User | `user-db-postgresql` | 5432 | Read/Write access |
| Product | `product-db-postgresql` | 5432 | Read/Write access |
| Order | `order-db-postgresql` | 5432 | Read/Write access |
| Payment | `payment-db-postgresql` | 5432 | Read/Write access |
| Notification | `notification-db-postgresql` | 5432 | Read/Write access |

All services also expose:
- Port 9187 for Prometheus metrics
- Headless service: `{name}-postgresql-headless`
- Read-only service: `{name}-postgresql-readonly`

## Pod Names

StatefulSets create pods with predictable names:

- Auth: `auth-db-postgresql-0`, `auth-db-postgresql-1`, `auth-db-postgresql-2`
- User: `user-db-postgresql-0`, `user-db-postgresql-1`, `user-db-postgresql-2`
- Product: `product-db-postgresql-0`, `product-db-postgresql-1`, `product-db-postgresql-2`
- Order: `order-db-postgresql-0`, `order-db-postgresql-1`, `order-db-postgresql-2`
- Payment: `payment-db-postgresql-0`, `payment-db-postgresql-1`, `payment-db-postgresql-2`
- Notification: `notification-db-postgresql-0`, `notification-db-postgresql-1`, `notification-db-postgresql-2`

Pod 0 is typically the primary for each database.

## Environment Variables for Services

Each microservice should use these environment variables:

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: {service}-db-secret
        key: DATABASE_URL
  # Or individual values:
  - name: DB_HOST
    value: "{service}-db-postgresql"
  - name: DB_PORT
    value: "5432"
  - name: DB_USER
    valueFrom:
      secretKeyRef:
        name: {service}-db-secret
        key: POSTGRES_USER
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: {service}-db-secret
        key: POSTGRES_PASSWORD
  - name: DB_NAME
    valueFrom:
      secretKeyRef:
        name: {service}-db-secret
        key: POSTGRES_DB
```

Replace `{service}` with: auth, user, product, order, payment, or notification

---

For complete documentation, see:
- **README.md** - Comprehensive guide
- **STRUCTURE.md** - Resource breakdown

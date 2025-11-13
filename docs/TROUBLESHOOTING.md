# Troubleshooting Guide

## Table of Contents
- [Common Issues](#common-issues)
- [Service Issues](#service-issues)
- [Database Issues](#database-issues)
- [Kubernetes Issues](#kubernetes-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Debugging Tools](#debugging-tools)

## Common Issues

### Application Won't Start

**Symptoms**:
- Service fails to start
- Immediate crash after startup
- Container keeps restarting

**Causes & Solutions**:

1. **Missing Environment Variables**
   ```bash
   # Check if all required env vars are set
   kubectl describe pod <pod-name> -n microservices
   kubectl logs <pod-name> -n microservices

   # Solution: Update ConfigMap or Secret
   kubectl edit configmap <service>-config -n microservices
   kubectl edit secret <service>-secret -n microservices

   # Restart deployment
   kubectl rollout restart deployment/<service> -n microservices
   ```

2. **Database Connection Failure**
   ```bash
   # Check database service
   kubectl get svc postgres-service -n microservices

   # Test database connectivity
   kubectl run pg-test --rm -it --image=postgres:15 -- bash
   psql -h postgres-service -U postgres -d auth_db

   # Check connection string format
   # Should be: postgresql://user:password@host:5432/database
   ```

3. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   netstat -tulpn | grep 3000

   # Kill process
   kill -9 <PID>

   # Or use different port
   PORT=3001 npm run dev
   ```

### 500 Internal Server Error

**Symptoms**:
- API returns 500 status code
- Generic error message
- No specific error details

**Solutions**:

1. **Check Application Logs**
   ```bash
   # Kubernetes
   kubectl logs deployment/<service> -n microservices --tail=100

   # Docker Compose
   docker-compose logs <service> --tail=100

   # Local
   tail -f logs/combined.log
   ```

2. **Check Error Stack Trace**
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug npm run dev

   # Check for common errors:
   # - Unhandled promise rejections
   # - Type errors
   # - Missing imports
   # - Database query errors
   ```

3. **Verify Database Connection**
   ```bash
   # Test database connection
   npm run test:db

   # Check database logs
   kubectl logs statefulset/postgres -n microservices
   ```

### 404 Not Found

**Symptoms**:
- API endpoint returns 404
- Route not found

**Solutions**:

1. **Verify Route Registration**
   ```typescript
   // Check if route is registered
   app.use('/api/users', userRoutes);

   // Verify route handler
   router.get('/:id', getUserById);
   ```

2. **Check API Gateway Routing**
   ```typescript
   // Verify proxy configuration
   {
     '/api/users': {
       target: 'http://user-service:3002',
       pathRewrite: { '^/api/users': '/api/users' }
     }
   }
   ```

3. **Test Service Directly**
   ```bash
   # Bypass API Gateway
   kubectl port-forward svc/user-service 3002:3002 -n microservices
   curl http://localhost:3002/api/users/123
   ```

### 401 Unauthorized

**Symptoms**:
- Authentication fails
- Token rejected
- Access denied

**Solutions**:

1. **Verify Token**
   ```bash
   # Decode JWT token
   echo "<token>" | cut -d. -f2 | base64 -d | jq

   # Check token expiration
   # "exp": 1705335300 (Unix timestamp)
   ```

2. **Check JWT Secret**
   ```bash
   # Verify JWT_SECRET matches across services
   kubectl get secret auth-service-secret -n microservices -o yaml
   kubectl get secret api-gateway-secret -n microservices -o yaml
   ```

3. **Test Authentication Flow**
   ```bash
   # Get fresh token
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'

   # Use token in request
   curl http://localhost:3000/api/users/profile \
     -H "Authorization: Bearer <token>"
   ```

## Service Issues

### Service Not Responding

**Diagnosis**:
```bash
# Check pod status
kubectl get pods -n microservices

# Check pod events
kubectl describe pod <pod-name> -n microservices

# Check service endpoints
kubectl get endpoints <service> -n microservices

# Check service logs
kubectl logs <pod-name> -n microservices --tail=50 -f
```

**Common Causes**:

1. **Health Check Failing**
   ```yaml
   # Update health check settings
   livenessProbe:
     httpGet:
       path: /health
       port: 3000
     initialDelaySeconds: 60  # Increase if service takes time to start
     periodSeconds: 10
     timeoutSeconds: 5
     failureThreshold: 3
   ```

2. **Resource Limits Too Low**
   ```yaml
   resources:
     requests:
       cpu: 200m
       memory: 256Mi
     limits:
       cpu: 1000m      # Increase if CPU throttling
       memory: 1024Mi  # Increase if OOMKilled
   ```

3. **Service Dependencies Not Ready**
   ```bash
   # Check if database is ready
   kubectl get pods -l app=postgres -n microservices

   # Check if Redis is ready
   kubectl get pods -l app=redis -n microservices

   # Add init container to wait for dependencies
   initContainers:
   - name: wait-for-db
     image: busybox
     command: ['sh', '-c', 'until nc -z postgres-service 5432; do echo waiting for db; sleep 2; done;']
   ```

### High Memory Usage

**Diagnosis**:
```bash
# Check memory usage
kubectl top pod -n microservices

# Get detailed metrics
kubectl describe pod <pod-name> -n microservices | grep -A 5 "Limits\|Requests"

# Check for memory leaks
# Look for increasing memory usage over time
```

**Solutions**:

1. **Identify Memory Leak**
   ```bash
   # Enable heap profiling
   node --max-old-space-size=4096 --heap-prof dist/index.js

   # Use Node.js memory profiling
   npm install -g clinic
   clinic doctor -- node dist/index.js
   ```

2. **Optimize Memory Usage**
   ```typescript
   // Close database connections
   pool.end();

   // Clear intervals and timeouts
   clearInterval(intervalId);

   // Remove event listeners
   emitter.removeAllListeners();

   // Use streams for large data
   const stream = fs.createReadStream('large-file.json');
   ```

3. **Increase Memory Limits**
   ```yaml
   resources:
     limits:
       memory: 2Gi  # Increase as needed
   ```

### Service Keeps Crashing

**Diagnosis**:
```bash
# Check restart count
kubectl get pods -n microservices

# Check crash reason
kubectl describe pod <pod-name> -n microservices

# Check previous logs
kubectl logs <pod-name> -n microservices --previous

# Common crash reasons:
# - OOMKilled (Out of Memory)
# - Error (Application error)
# - CrashLoopBackOff (Repeated failures)
```

**Solutions**:

1. **OOMKilled**
   ```yaml
   # Increase memory limit
   resources:
     limits:
       memory: 2Gi
   ```

2. **Unhandled Exceptions**
   ```typescript
   // Add global error handlers
   process.on('uncaughtException', (error) => {
     logger.error('Uncaught Exception', { error });
     process.exit(1);
   });

   process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled Rejection', { reason, promise });
     process.exit(1);
   });
   ```

3. **CrashLoopBackOff**
   ```bash
   # Usually caused by misconfiguration
   # Check logs for specific error
   kubectl logs <pod-name> -n microservices --previous

   # Common issues:
   # - Missing environment variables
   # - Cannot connect to database
   # - Invalid configuration
   ```

## Database Issues

### Connection Pool Exhausted

**Symptoms**:
- "sorry, too many clients already" error
- Connection timeouts
- Slow response times

**Solutions**:

1. **Increase Connection Pool Size**
   ```typescript
   const pool = new Pool({
     max: 20,  // Increase from default 10
     min: 5,
   });
   ```

2. **Check for Connection Leaks**
   ```typescript
   // Always release connections
   const client = await pool.connect();
   try {
     const result = await client.query('SELECT * FROM users');
     return result.rows;
   } finally {
     client.release();  // Important!
   }

   // Or use pool.query (automatically releases)
   const result = await pool.query('SELECT * FROM users');
   ```

3. **Increase Database Max Connections**
   ```sql
   -- Check current connections
   SELECT count(*) FROM pg_stat_activity;

   -- Check max connections
   SHOW max_connections;

   -- Increase max connections (requires restart)
   ALTER SYSTEM SET max_connections = 200;
   ```

### Slow Queries

**Diagnosis**:
```sql
-- Find slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check currently running queries
SELECT
    pid,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Solutions**:

1. **Add Missing Indexes**
   ```sql
   -- Analyze query
   EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = '...';

   -- Add index if needed
   CREATE INDEX CONCURRENTLY idx_products_category_id ON products(category_id);
   ```

2. **Optimize Query**
   ```sql
   -- Bad: N+1 query
   SELECT * FROM orders;
   -- Then for each order:
   SELECT * FROM order_items WHERE order_id = '...';

   -- Good: Use JOIN
   SELECT o.*, oi.*
   FROM orders o
   LEFT JOIN order_items oi ON o.id = oi.order_id;
   ```

3. **Use Query Caching**
   ```typescript
   // Cache frequent queries in Redis
   const cacheKey = `products:${categoryId}`;
   let products = await redis.get(cacheKey);

   if (!products) {
     products = await db.query('SELECT * FROM products WHERE category_id = $1', [categoryId]);
     await redis.set(cacheKey, JSON.stringify(products), 'EX', 3600);
   }
   ```

### Database Locked

**Symptoms**:
- "database is locked" error
- Queries hanging
- Deadlocks

**Solutions**:

1. **Find Blocking Queries**
   ```sql
   -- Find locks
   SELECT
       blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS blocking_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;

   -- Kill blocking query
   SELECT pg_terminate_backend(blocking_pid);
   ```

2. **Use Proper Transaction Isolation**
   ```typescript
   // Use READ COMMITTED instead of SERIALIZABLE
   await pool.query('BEGIN ISOLATION LEVEL READ COMMITTED');
   ```

3. **Reduce Transaction Time**
   ```typescript
   // Keep transactions short
   await pool.query('BEGIN');
   try {
     // Do minimal work here
     await pool.query('UPDATE ...');
     await pool.query('COMMIT');
   } catch (error) {
     await pool.query('ROLLBACK');
   }
   ```

## Kubernetes Issues

### Pod Stuck in Pending

**Diagnosis**:
```bash
kubectl describe pod <pod-name> -n microservices
```

**Common Causes**:

1. **Insufficient Resources**
   ```bash
   # Check node resources
   kubectl top nodes

   # Solution: Scale cluster or reduce resource requests
   kubectl scale deployment <service> --replicas=2
   ```

2. **PersistentVolumeClaim Not Bound**
   ```bash
   kubectl get pvc -n microservices

   # Check PVC status
   kubectl describe pvc <pvc-name> -n microservices
   ```

3. **Image Pull Error**
   ```bash
   # Check image pull secrets
   kubectl get secrets -n microservices

   # Create image pull secret
   kubectl create secret docker-registry regcred \
     --docker-server=<registry> \
     --docker-username=<username> \
     --docker-password=<password> \
     -n microservices
   ```

### ImagePullBackOff

**Causes & Solutions**:

1. **Invalid Image Name**
   ```bash
   # Check image name in deployment
   kubectl get deployment <service> -n microservices -o yaml | grep image

   # Update image
   kubectl set image deployment/<service> <container>=<new-image> -n microservices
   ```

2. **Authentication Required**
   ```bash
   # Add imagePullSecrets to deployment
   kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}' -n microservices
   ```

3. **Image Doesn't Exist**
   ```bash
   # Verify image exists
   docker pull <image>

   # Build and push image
   docker build -t <image> .
   docker push <image>
   ```

### CrashLoopBackOff

**Solutions**:
```bash
# Check why pod is crashing
kubectl logs <pod-name> -n microservices --previous

# Increase initialDelaySeconds if app needs more time to start
kubectl edit deployment <service> -n microservices

# Check readiness and liveness probes
kubectl describe pod <pod-name> -n microservices
```

### Service Not Accessible via Ingress

**Diagnosis**:
```bash
# Check ingress
kubectl get ingress -n microservices
kubectl describe ingress <ingress-name> -n microservices

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check service
kubectl get svc <service> -n microservices
kubectl get endpoints <service> -n microservices
```

**Solutions**:

1. **Ingress Not Configured**
   ```bash
   kubectl apply -f k8s/ingress/ingress.yaml
   ```

2. **DNS Not Configured**
   ```bash
   # Get ingress IP
   kubectl get ingress -n microservices

   # Update DNS records to point to ingress IP
   ```

3. **TLS Certificate Issue**
   ```bash
   # Check certificate
   kubectl get certificate -n microservices
   kubectl describe certificate <cert-name> -n microservices

   # Check cert-manager logs
   kubectl logs -n cert-manager deployment/cert-manager
   ```

## Network Issues

### Cannot Connect to Service

**Diagnosis**:
```bash
# Test from within cluster
kubectl run test-pod --rm -it --image=alpine -- sh
apk add curl
curl http://<service>.<namespace>.svc.cluster.local:<port>/health

# Check DNS resolution
nslookup <service>.<namespace>.svc.cluster.local

# Check network policies
kubectl get networkpolicies -n microservices
```

**Solutions**:

1. **Service Not Exposed**
   ```yaml
   # Ensure service is created
   apiVersion: v1
   kind: Service
   metadata:
     name: user-service
   spec:
     selector:
       app: user-service
     ports:
       - port: 3002
         targetPort: 3002
   ```

2. **Network Policy Blocking**
   ```bash
   # Check network policies
   kubectl describe networkpolicy <policy-name> -n microservices

   # Temporarily delete policy to test
   kubectl delete networkpolicy <policy-name> -n microservices
   ```

3. **Firewall Rules**
   ```bash
   # Check cloud provider firewall rules
   # AWS: Security Groups
   # GCP: Firewall Rules
   # Azure: Network Security Groups
   ```

### High Network Latency

**Diagnosis**:
```bash
# Check pod network latency
kubectl exec -it <pod-name> -n microservices -- ping <service>

# Check service mesh latency
kubectl exec -it <pod-name> -n microservices -- curl -w "@curl-format.txt" http://<service>:port/
```

**Solutions**:

1. **Use Service Mesh**
   ```bash
   # Enable Istio or Linkerd for better traffic management
   ```

2. **Optimize Service Calls**
   ```typescript
   // Use connection pooling
   const agent = new http.Agent({
     keepAlive: true,
     maxSockets: 50,
   });

   // Implement caching
   // Reduce unnecessary service calls
   // Use async/parallel requests
   ```

3. **Collocate Services**
   ```yaml
   # Use pod affinity to schedule related services on same node
   affinity:
     podAffinity:
       preferredDuringSchedulingIgnoredDuringExecution:
       - weight: 100
         podAffinityTerm:
           labelSelector:
             matchExpressions:
             - key: app
               operator: In
               values:
               - order-service
           topologyKey: kubernetes.io/hostname
   ```

## Performance Issues

### Slow Response Times

**Diagnosis**:
```bash
# Check response times
kubectl logs deployment/<service> -n microservices | grep "response_time"

# Check Prometheus metrics
http_request_duration_seconds

# Check Jaeger traces
# Open http://localhost:16686
```

**Solutions**:

1. **Database Optimization**
   - Add indexes
   - Optimize queries
   - Use connection pooling
   - Cache frequent queries

2. **Caching**
   ```typescript
   // Implement Redis caching
   const cached = await redis.get(key);
   if (cached) return JSON.parse(cached);

   const data = await fetchData();
   await redis.set(key, JSON.stringify(data), 'EX', 3600);
   ```

3. **Horizontal Scaling**
   ```bash
   # Scale deployment
   kubectl scale deployment <service> --replicas=5 -n microservices

   # Or use HPA
   kubectl autoscale deployment <service> --cpu-percent=70 --min=3 --max=10 -n microservices
   ```

### High CPU Usage

**Diagnosis**:
```bash
# Check CPU usage
kubectl top pods -n microservices

# Check CPU throttling
kubectl describe pod <pod-name> -n microservices | grep -i cpu
```

**Solutions**:

1. **Optimize Code**
   ```typescript
   // Use efficient algorithms
   // Avoid synchronous operations
   // Use worker threads for CPU-intensive tasks
   ```

2. **Increase CPU Limits**
   ```yaml
   resources:
     limits:
       cpu: 2000m  # Increase as needed
   ```

3. **Scale Horizontally**
   ```bash
   kubectl scale deployment <service> --replicas=5 -n microservices
   ```

## Authentication Issues

### Token Validation Fails

**Solutions**:

1. **Verify JWT Secret**
   ```bash
   # Check if JWT_SECRET is consistent
   kubectl get secret api-gateway-secret -n microservices -o yaml
   kubectl get secret auth-service-secret -n microservices -o yaml
   ```

2. **Check Token Expiration**
   ```typescript
   // Implement token refresh logic
   if (error.name === 'TokenExpiredError') {
     // Refresh token
     const newToken = await refreshAccessToken(refreshToken);
   }
   ```

3. **Verify Token Format**
   ```bash
   # Token should be: Bearer <jwt>
   # Decode and verify token structure
   ```

### Session Management Issues

**Solutions**:

1. **Check Redis Connection**
   ```bash
   # Test Redis connectivity
   kubectl exec -it <api-gateway-pod> -n microservices -- redis-cli -h redis-service ping
   ```

2. **Verify Session Storage**
   ```typescript
   // Ensure sessions are being stored correctly
   logger.info('Session stored', { sessionId, userId });
   ```

## Debugging Tools

### Essential Commands

```bash
# Logs
kubectl logs <pod-name> -n microservices --tail=100 -f
kubectl logs deployment/<service> -n microservices --all-containers=true

# Exec into pod
kubectl exec -it <pod-name> -n microservices -- sh

# Port forwarding
kubectl port-forward svc/<service> 3000:3000 -n microservices

# Events
kubectl get events -n microservices --sort-by='.lastTimestamp'

# Resources
kubectl top pods -n microservices
kubectl top nodes

# Describe
kubectl describe pod <pod-name> -n microservices
kubectl describe deployment <service> -n microservices

# Debug pod
kubectl debug <pod-name> -it --image=busybox -n microservices
```

### Monitoring Tools

```bash
# Prometheus queries
curl http://prometheus:9090/api/v1/query?query=up

# Grafana dashboards
http://grafana:3000

# Jaeger traces
http://jaeger:16686

# K9s (Terminal UI)
k9s -n microservices
```

### Network Debugging

```bash
# DNS lookup
nslookup <service>.<namespace>.svc.cluster.local

# Curl test
curl -v http://<service>:<port>/health

# Network trace
tcpdump -i any port 3000

# Check connectivity
telnet <service> <port>
nc -zv <service> <port>
```

## Getting Help

If you're still stuck:

1. **Check Documentation**:
   - Review relevant docs in /docs
   - Check service README files

2. **Search Issues**:
   - GitHub Issues
   - Stack Overflow
   - Kubernetes Troubleshooting docs

3. **Ask for Help**:
   - Team Slack channel
   - Create GitHub issue
   - Contact DevOps team

4. **Provide Context**:
   - Error messages
   - Logs
   - Steps to reproduce
   - Environment details

# Prometheus & Grafana Monitoring Stack

Comprehensive monitoring solution for cloud-native microservices with Prometheus, Grafana, AlertManager, and complete observability stack.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Installation](#installation)
- [Dashboard Access](#dashboard-access)
- [Custom Metrics Guide](#custom-metrics-guide)
- [Alert Configuration](#alert-configuration)
- [Backup and Retention](#backup-and-retention)
- [Troubleshooting](#troubleshooting)

## Overview

This monitoring stack provides:

- **Metrics Collection**: Prometheus scraping all microservices and infrastructure
- **Visualization**: Pre-configured Grafana dashboards for all services
- **Alerting**: Production-ready alert rules with multi-channel notifications
- **Service Discovery**: Automatic discovery of new services via Kubernetes SD
- **Long-term Storage**: 30-day retention with configurable remote write
- **High Availability**: HA configuration for Prometheus

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Grafana UI (Port 3000)                   │
│                  Visualization & Dashboards                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Prometheus (Port 9090)                       │
│                  Metrics Storage & Querying                     │
│                    - 30 day retention                           │
│                    - 50GB storage                               │
└──┬──────────────┬──────────────┬───────────────┬────────────────┘
   │              │              │               │
   ▼              ▼              ▼               ▼
┌──────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐
│ Node │   │  Kube    │   │ Service  │   │ PostgreSQL  │
│Export│   │  State   │   │ Metrics  │   │ Exporters   │
│      │   │ Metrics  │   │          │   │             │
└──────┘   └──────────┘   └──────────┘   └─────────────┘
   │              │              │               │
   ▼              ▼              ▼               ▼
Infrastructure  K8s Resources  Microservices   Databases
   Metrics        Metrics        Metrics        Metrics

                             │
                             ▼
                    ┌────────────────┐
                    │  AlertManager  │
                    │  (Port 9093)   │
                    └────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                  Slack          PagerDuty
                  Email          Webhooks
```

## Components

### 1. Prometheus
- **Version**: v2.48.0
- **Replicas**: 2 (HA mode)
- **Storage**: 50Gi PVC
- **Retention**: 30 days
- **Scrape Interval**: 15s
- **Features**:
  - Kubernetes service discovery
  - Automatic pod/service scraping
  - Alert rule evaluation
  - Federation support

### 2. Grafana
- **Version**: 10.2.0
- **Storage**: 10Gi PVC
- **Port**: 3000
- **Dashboards**:
  - Kubernetes Cluster Overview
  - Microservices Overview
  - API Gateway Dashboard
  - Database Dashboard
  - Business Metrics Dashboard

### 3. Node Exporter
- **Version**: v1.7.0
- **Type**: DaemonSet (runs on all nodes)
- **Metrics**: CPU, memory, disk, network

### 4. Kube State Metrics
- **Version**: v2.10.1
- **Metrics**: Kubernetes resource states

### 5. AlertManager
- **Version**: v0.26.0
- **Features**:
  - Alert routing and grouping
  - Multi-channel notifications
  - Alert inhibition rules

## Installation

### Prerequisites

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Install StorageClass for persistent volumes (if not exists)
kubectl apply -f ../databases/storage-class.yaml
```

### Quick Install

```bash
# Apply all monitoring components
kubectl apply -k k8s/monitoring/

# Verify deployment
kubectl get pods -n monitoring

# Check services
kubectl get svc -n monitoring
```

### Step-by-Step Installation

```bash
# 1. Install Prometheus
kubectl apply -f prometheus/rbac.yaml
kubectl apply -f prometheus/configmap.yaml
kubectl apply -f prometheus/pvc.yaml
kubectl apply -f prometheus/deployment.yaml
kubectl apply -f prometheus/service.yaml

# 2. Install Grafana
kubectl apply -f grafana/secret.yaml
kubectl apply -f grafana/configmap.yaml
kubectl apply -f grafana/pvc.yaml
kubectl apply -f grafana/deployment.yaml
kubectl apply -f grafana/service.yaml

# 3. Install Node Exporter
kubectl apply -f node-exporter/

# 4. Install Kube State Metrics
kubectl apply -f kube-state-metrics/

# 5. Install AlertManager
kubectl apply -f alertmanager/

# 6. Install Prometheus Rules
kubectl apply -f prometheus-rules/
```

### Configure Secrets

Before deploying to production, update the secrets:

```bash
# Grafana admin credentials
kubectl create secret generic grafana-secret \
  --from-literal=admin-user=admin \
  --from-literal=admin-password='YOUR_SECURE_PASSWORD' \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

# AlertManager notification credentials
kubectl create secret generic alertmanager-secrets \
  --from-literal=slack_webhook_url='https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  --from-literal=pagerduty_key='YOUR_PAGERDUTY_KEY' \
  --from-literal=smtp_password='YOUR_SMTP_PASSWORD' \
  --namespace=monitoring \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Dashboard Access

### Port Forwarding (Development)

```bash
# Access Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open http://localhost:3000
# Default credentials: admin / changeme123!

# Access AlertManager
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# Open http://localhost:9093
```

### Ingress (Production)

Create Ingress resources:

```yaml
# grafana-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana-ingress
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - grafana.example.com
    secretName: grafana-tls
  rules:
  - host: grafana.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
```

### Available Dashboards

1. **Cluster Overview** (`/d/cluster-overview`)
   - Node resources (CPU, memory, disk)
   - Network traffic
   - Pod distribution

2. **Microservices Overview** (`/d/microservices-overview`)
   - Request rates by service
   - Latency percentiles
   - Error rates
   - Pod health

3. **API Gateway Dashboard** (`/d/api-gateway-dashboard`)
   - Request rate by endpoint
   - Status code distribution
   - Latency percentiles
   - Active connections

4. **Database Dashboard** (`/d/database-dashboard`)
   - Connection counts
   - Transaction rates
   - Cache hit ratios
   - Query performance

5. **Business Metrics Dashboard** (`/d/business-metrics-dashboard`)
   - Order volume
   - Revenue tracking
   - User activity
   - Payment success rates

## Custom Metrics Guide

### Adding Metrics to Your Service

#### 1. Instrument Your Application

**Node.js/Express Example:**
```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

**Python/Flask Example:**
```python
from prometheus_client import Counter, Histogram, generate_latest

http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

@app.route('/metrics')
def metrics():
    return generate_latest()
```

#### 2. Add Prometheus Annotations to Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

#### 3. Create ServiceMonitor (Optional)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-service
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-service
  endpoints:
  - port: metrics
    interval: 15s
```

### Business Metrics Examples

```javascript
// Order metrics
const ordersTotal = new promClient.Counter({
  name: 'orders_total',
  help: 'Total orders created',
  labelNames: ['status']
});

const revenueTotal = new promClient.Counter({
  name: 'revenue_total',
  help: 'Total revenue',
  labelNames: ['currency']
});

// User metrics
const userRegistrations = new promClient.Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations'
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Currently active users'
});

// Payment metrics
const paymentAttempts = new promClient.Counter({
  name: 'payment_attempts_total',
  help: 'Total payment attempts',
  labelNames: ['gateway', 'status']
});
```

## Alert Configuration

### Alert Severity Levels

- **Critical**: Immediate action required (page on-call)
- **Warning**: Requires attention within hours
- **Info**: Informational, no action required

### Notification Channels

1. **Slack**
   - `#critical-alerts` - Critical alerts only
   - `#service-alerts` - Service health warnings
   - `#database-alerts` - Database issues
   - `#business-metrics` - Business KPI alerts

2. **PagerDuty**
   - Critical alerts trigger pages
   - Automatic escalation policies

3. **Email**
   - Team distribution lists
   - On-call engineers

### Customizing Alerts

Edit alert rules in `prometheus-rules/`:

```yaml
- alert: MyCustomAlert
  expr: my_metric > 100
  for: 5m
  labels:
    severity: warning
    component: my-service
  annotations:
    summary: "My custom alert fired"
    description: "Metric value is {{ $value }}"
```

Apply changes:
```bash
kubectl apply -f prometheus-rules/
kubectl rollout restart deployment/prometheus -n monitoring
```

### Testing Alerts

```bash
# Check alert rules loaded
kubectl exec -n monitoring prometheus-0 -- promtool check rules /etc/prometheus/rules/*.yaml

# View active alerts
curl http://localhost:9090/api/v1/alerts

# Silence an alert
amtool silence add alertname=MyAlert --comment="Maintenance window"
```

### Alert Best Practices

1. **Set appropriate thresholds**
   - Based on historical data
   - Account for normal variations
   - Use `for` clause to avoid flapping

2. **Use alert inhibition**
   - Suppress related alerts
   - Reduce alert fatigue

3. **Provide actionable descriptions**
   - Include runbook links
   - Explain impact
   - Suggest remediation

4. **Route alerts appropriately**
   - Critical → Page
   - Warning → Slack
   - Info → Log only

## Backup and Retention

### Prometheus Data Backup

```bash
# Create backup job
kubectl create job --from=cronjob/prometheus-backup prometheus-backup-manual -n monitoring

# Verify backup
kubectl logs -n monitoring job/prometheus-backup-manual
```

### Grafana Dashboard Backup

```bash
# Export all dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana:3000/api/search | \
  jq -r '.[].uid' | \
  xargs -I {} curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    http://grafana:3000/api/dashboards/uid/{} \
    > dashboard-{}.json
```

### Retention Policies

- **Prometheus**: 30 days local storage
- **Remote Write**: For long-term storage, configure Cortex, Thanos, or VictoriaMetrics
- **Grafana**: Unlimited dashboard history

### Configure Remote Write

Edit `prometheus/configmap.yaml`:

```yaml
remote_write:
  - url: "http://cortex:9009/api/prom/push"
    queue_config:
      capacity: 10000
      max_shards: 50
```

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Check service discovery
curl http://localhost:9090/api/v1/targets/metadata

# View logs
kubectl logs -n monitoring deployment/prometheus -c prometheus
```

### Grafana Dashboard Not Loading

```bash
# Check datasource
kubectl exec -n monitoring deployment/grafana -- \
  curl http://localhost:3000/api/datasources

# Check dashboard provisioning
kubectl logs -n monitoring deployment/grafana

# Restart Grafana
kubectl rollout restart deployment/grafana -n monitoring
```

### Alerts Not Firing

```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check AlertManager config
kubectl exec -n monitoring deployment/alertmanager -- \
  amtool config show

# Test alert route
kubectl exec -n monitoring deployment/alertmanager -- \
  amtool config routes test --config.file=/etc/alertmanager/alertmanager.yml
```

### High Memory Usage

```bash
# Check Prometheus memory
kubectl top pods -n monitoring

# Reduce retention
kubectl set env deployment/prometheus -n monitoring \
  PROMETHEUS_RETENTION_TIME=15d

# Reduce scrape interval
# Edit prometheus/configmap.yaml
# Change scrape_interval: 30s
```

### Missing Metrics

1. **Check service annotations**
   ```bash
   kubectl get svc my-service -o yaml | grep prometheus
   ```

2. **Verify metrics endpoint**
   ```bash
   kubectl port-forward svc/my-service 9090:9090
   curl http://localhost:9090/metrics
   ```

3. **Check Prometheus config**
   ```bash
   kubectl exec -n monitoring prometheus-0 -- \
     cat /etc/prometheus/prometheus.yml
   ```

## Performance Tuning

### Prometheus Optimization

```yaml
# prometheus/deployment.yaml
args:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=45GB'
  - '--storage.tsdb.min-block-duration=2h'
  - '--storage.tsdb.max-block-duration=2h'
  - '--query.max-concurrency=20'
  - '--query.timeout=2m'
```

### Grafana Optimization

```yaml
# grafana/deployment.yaml
env:
  - name: GF_DATABASE_WAL
    value: "true"
  - name: GF_QUERY_CACHE_MAX_SIZE
    value: "100"
```

## Security Considerations

1. **Change default passwords** immediately
2. **Enable HTTPS** for all dashboards
3. **Use RBAC** for Kubernetes resources
4. **Encrypt sensitive data** in secrets
5. **Regular updates** of all components
6. **Network policies** to restrict access
7. **Audit logging** enabled

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Repository](https://grafana.com/grafana/dashboards/)

## Support

For issues or questions:
- Check logs: `kubectl logs -n monitoring <pod-name>`
- Review metrics: http://localhost:9090
- Check alerts: http://localhost:9093

## License

This monitoring configuration is part of the cloud-native microservices system.
